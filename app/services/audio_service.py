# app/services/audio_service.py
import os
import logging
import json
from uuid import UUID, uuid4
from typing import Any, Optional
from fastapi import HTTPException, status
from app.core.database import db
from app.core.encryption import encrypt_text
from app.core.config import settings
from groq import AsyncGroq

logger = logging.getLogger(__name__)

# Constants for security & maintainability
ALLOWED_EXTENSIONS = {".webm", ".mp3", ".wav", ".m4a", ".ogg"}
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB

class AudioService:
    """
    Service responsible for handling audio uploading, validation,
    and transcription using Groq Whisper.
    """

    @staticmethod
    def _parse_json(val):
        if val is None:
            return None
        if isinstance(val, str):
            try:
                return json.loads(val)
            except Exception:
                return val
        return val

    @staticmethod
    async def _assert_thread_owner(connection, thread_id: str, owner_id: str, owner_type: str):
        """
        Security check to verify thread ownership.
        """
        query = """
            SELECT id FROM chat_threads
            WHERE id = $1 AND owner_id = $2 AND owner_type = $3
        """
        row = await connection.fetchrow(query, UUID(thread_id), UUID(owner_id), owner_type)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ليس لديك صلاحية للوصول إلى هذه المحادثة أو المحادثة غير موجودة."
            )

    @staticmethod
    async def process_audio_message(
        thread_id: str,
        owner_id: str,
        owner_type: str,
        file: Any,
        audio_duration: Optional[Any] = 0.0
    ) -> dict:
        api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            logger.error("Groq API Key is not configured.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Groq API Key is not configured."
            )

        # 1. Security check: Validate filename and extension
        filename = getattr(file, "filename", None) or ""
        ext = os.path.splitext(filename)[1].lower() if filename else ".webm"
        if not ext or ext not in ALLOWED_EXTENSIONS:
            logger.warning(f"Rejected upload with unsupported extension: {ext}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"نوع الملف غير مدعوم. الأنواع المدعومة هي: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # 2. Security check: Validate file size (read up to MAX_AUDIO_SIZE + 1)
        contents = await file.read()
        if len(contents) > MAX_AUDIO_SIZE:
            logger.warning(f"Rejected upload exceeding size limit: {len(contents)} bytes")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="حجم الملف الصوتي كبير جداً. الحد الأقصى هو 25 ميجابايت."
            )

        # 3. Create upload directory and generate unique filename safely
        upload_dir = os.path.join(os.getcwd(), "app", "uploads", "audio")
        os.makedirs(upload_dir, exist_ok=True)

        unique_name = f"{uuid4()}{ext}"
        saved_file_path = os.path.join(upload_dir, unique_name)

        # Write safely
        try:
            with open(saved_file_path, "wb") as f:
                f.write(contents)
        except Exception as e:
            logger.exception(f"Failed to save audio file to disk: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="حدث خطأ أثناء حفظ الملف الصوتي."
            )

        relative_audio_path = f"/uploads/audio/{unique_name}"
        transcription_text = ""

        # 4. Perform Groq Whisper transcription
        try:
            client = AsyncGroq(api_key=api_key.strip())
            with open(saved_file_path, "rb") as audio_file:
                transcription = await client.audio.transcriptions.create(
                    file=(unique_name, audio_file.read()),
                    model="whisper-large-v3",
                    language="ar",
                    response_format="text"
                )
                transcription_text = str(transcription).strip()
        except Exception as e:
            logger.exception(f"Error transcribing audio with Groq Whisper: {e}")
            transcription_text = "[تسجيل صوتي]"

        if not transcription_text:
            transcription_text = "[تسجيل صوتي]"

        # 5. Parse duration safely
        duration_val = "0.0"
        if audio_duration is not None:
            duration_str = str(audio_duration).strip()
            if duration_str:
                duration_val = duration_str[:10]

        # 6. Save message to DB inside transaction
        async with db.pool.acquire() as connection:
            await AudioService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            encrypted_content = encrypt_text(transcription_text)

            async with connection.transaction():
                query = """
                    INSERT INTO chat_messages (
                        thread_id, sender_type, content, is_audio, audio_duration, audio_file_path
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                """
                row = await connection.fetchrow(
                    query,
                    UUID(thread_id),
                    "user",
                    encrypted_content,
                    True,
                    duration_val,
                    relative_audio_path
                )

                update_thread_query = """
                    UPDATE chat_threads
                    SET message_count = message_count + 1, updated_at = now()
                    WHERE id = $1
                """
                await connection.execute(update_thread_query, UUID(thread_id))

                res = dict(row) if row else None
                if res:
                    res["content"] = transcription_text
                    res["bento_data"] = AudioService._parse_json(res.get("bento_data"))
                    res["insight_data"] = AudioService._parse_json(res.get("insight_data"))
                return res
