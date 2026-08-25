# app/services/audio_service.py
import os
import logging
import json
from uuid import UUID, uuid4
from typing import Any, Optional
from fastapi import HTTPException, status

from app.core.database import db
from app.core.encryption import encrypt_text, encrypt_binary
from app.core.config import settings
from app.services.transcription_service import TranscriptionService

logger = logging.getLogger(__name__)

# Constants for security & maintainability
ALLOWED_EXTENSIONS = {".webm", ".mp3", ".wav", ".m4a", ".ogg", ".mp4"}
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB

class AudioService:
    """
    Service responsible for handling audio uploading, validation,
    and transcription using the centralized TranscriptionService.
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
        # 1. Security check: Validate filename and extension safely
        raw_filename = getattr(file, "filename", None) or ""
        filename = os.path.basename(raw_filename)
        ext = os.path.splitext(filename)[1].lower() if filename else ".webm"
        if not ext or ext not in ALLOWED_EXTENSIONS:
            logger.warning(f"Rejected upload with unsupported extension: {ext}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"نوع الملف غير مدعوم. الأنواع المدعومة هي: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # 2. Security check: Validate file size & magic bytes MIME type
        contents = await file.read()
        if len(contents) > MAX_AUDIO_SIZE:
            logger.warning(f"Rejected upload exceeding size limit: {len(contents)} bytes")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="حجم الملف الصوتي كبير جداً. الحد الأقصى هو 25 ميجابايت."
            )

        # Magic bytes check for audio files
        header = contents[:12]
        is_valid_magic = (
            header.startswith(b"\x1a\x45\xdf\xa3") or  # WebM
            header.startswith(b"OggS") or             # Ogg
            header.startswith(b"RIFF") or             # WAV
            header.startswith(b"ID3") or              # MP3 ID3
            header.startswith(b"\xff\xfb") or         # MP3 raw
            header.startswith(b"\xff\xfa") or         # MP3 raw
            b"ftyp" in header                         # MP4 / M4A
        )
        if not is_valid_magic:
            logger.warning(f"Rejected upload with invalid magic bytes: {filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="محتوى الملف لا يطابق ملف صوتي صالح."
            )

        if len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="الملف الصوتي فارغ. يرجى المحاولة مرة أخرى."
            )

        # 3. Create upload directory and generate unique filename safely (prevent path traversal)
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
        duration_val = "0.0"
        if audio_duration is not None:
            duration_str = str(audio_duration).strip()
            if duration_str:
                duration_val = duration_str[:10]

        # 4. Save message to DB inside transaction (initially as processing to avoid orphan files)
        message_id = None
        async with db.pool.acquire() as connection:
            await AudioService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            encrypted_placeholder = encrypt_text("[جاري تفريغ التسجيل الصوتي...]")
            encrypted_audio = encrypt_binary(contents) if contents else None

            try:
                async with connection.transaction():
                    query = """
                        INSERT INTO chat_messages (
                            thread_id, sender_type, content, is_audio, audio_duration, audio_file_path, audio_data, transcription_status
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING *
                    """
                    row = await connection.fetchrow(
                        query,
                        UUID(thread_id),
                        "user",
                        encrypted_placeholder,
                        True,
                        duration_val,
                        relative_audio_path,
                        encrypted_audio,
                        "processing"
                    )

                    update_thread_query = """
                        UPDATE chat_threads
                        SET message_count = message_count + 1, updated_at = now()
                        WHERE id = $1
                    """
                    await connection.execute(update_thread_query, UUID(thread_id))

                    res = dict(row) if row else None
                    if res:
                        message_id = res["id"]
            except Exception as db_err:
                logger.exception(f"Failed to insert audio message in DB: {db_err}")
                # Clean up local file to avoid orphan file
                if os.path.exists(saved_file_path):
                    try:
                        os.remove(saved_file_path)
                    except Exception as clean_err:
                        logger.error(f"Failed to clean up file: {clean_err}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="حدث خطأ أثناء تسجيل الرسالة الصوتية في قاعدة البيانات."
                )

        # 5. Perform OpenAI Transcription using Centralized Service outside DB transaction
        transcription_text = ""
        transcription_status = "completed"
        try:
            transcription_text = await TranscriptionService.transcribe_audio(
                contents, unique_name
            )
        except Exception as transcribe_err:
            logger.error(f"Transcription failed for message {message_id}: {transcribe_err}")
            transcription_status = "failed"
            transcription_text = "[فشل التفريغ الصوتي - اضغط لإعادة المحاولة]"

        # 6. Update the message status and content in the database
        async with db.pool.acquire() as connection:
            encrypted_content = encrypt_text(transcription_text)
            update_query = """
                UPDATE chat_messages
                SET content = $1, transcription_status = $2
                WHERE id = $3
                RETURNING *
            """
            row = await connection.fetchrow(update_query, encrypted_content, transcription_status, message_id)

            res = dict(row) if row else None
            if res:
                res["content"] = transcription_text
                res["bento_data"] = AudioService._parse_json(res.get("bento_data"))
                res["insight_data"] = AudioService._parse_json(res.get("insight_data"))
                return res

    @staticmethod
    async def retry_transcription(
        message_id: str,
        owner_id: str,
        owner_type: str
    ) -> dict:
        """
        Retry transcription for a failed audio message without re-uploading.
        """
        async with db.pool.acquire() as connection:
            # 1. Fetch message and verify thread ownership
            query = """
                SELECT msg.*, thread.owner_id, thread.owner_type
                FROM chat_messages msg
                JOIN chat_threads thread ON msg.thread_id = thread.id
                WHERE msg.id = $1
            """
            row = await connection.fetchrow(query, UUID(message_id))
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="الرسالة غير موجودة."
                )

            msg_data = dict(row)
            if str(msg_data["owner_id"]) != owner_id or msg_data["owner_type"] != owner_type:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="ليس لديك صلاحية للوصول إلى هذه الرسالة."
                )

            if not msg_data["is_audio"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="هذه الرسالة ليست رسالة صوتية."
                )

            if msg_data["transcription_status"] != "failed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="يمكن فقط إعادة تفريغ الرسائل التي فشلت عملية تفريغها."
                )

            # 2. Get audio data. Try reading from disk first. If not found, use database backup.
            audio_bytes = b""
            saved_file_path = ""
            if msg_data["audio_file_path"]:
                saved_file_path = os.path.join(os.getcwd(), "app", msg_data["audio_file_path"].lstrip("/"))
                if os.path.exists(saved_file_path):
                    try:
                        with open(saved_file_path, "rb") as f:
                            audio_bytes = f.read()
                    except Exception as disk_err:
                        logger.error(f"Failed to read audio file from disk: {disk_err}")

            if not audio_bytes and msg_data["audio_data"]:
                from app.core.encryption import decrypt_binary
                try:
                    audio_bytes = decrypt_binary(msg_data["audio_data"])
                except Exception as db_decrypt_err:
                    logger.error(f"Failed to decrypt database audio backup: {db_decrypt_err}")

            if not audio_bytes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="تعذر العثور على الملف الصوتي لإعادة المحاولة."
                )

            unique_name = os.path.basename(msg_data["audio_file_path"]) if msg_data["audio_file_path"] else f"{message_id}.webm"

            # Set state to processing first
            await connection.execute(
                "UPDATE chat_messages SET transcription_status = 'processing' WHERE id = $1",
                UUID(message_id)
            )

        # Outside connection pool during LLM request
        transcription_text = ""
        transcription_status = "completed"
        try:
            transcription_text = await TranscriptionService.transcribe_audio(
                audio_bytes, unique_name
            )
        except Exception as transcribe_err:
            logger.error(f"Retry transcription failed for message {message_id}: {transcribe_err}")
            transcription_status = "failed"
            transcription_text = "[فشل التفريغ الصوتي - اضغط لإعادة المحاولة]"

        # Save back to database
        async with db.pool.acquire() as connection:
            encrypted_content = encrypt_text(transcription_text)
            update_query = """
                UPDATE chat_messages
                SET content = $1, transcription_status = $2
                WHERE id = $3
                RETURNING *
            """
            row = await connection.fetchrow(update_query, encrypted_content, transcription_status, UUID(message_id))

            res = dict(row) if row else None
            if res:
                res["content"] = transcription_text
                res["bento_data"] = AudioService._parse_json(res.get("bento_data"))
                res["insight_data"] = AudioService._parse_json(res.get("insight_data"))
                return res

    @staticmethod
    async def process_attachment_message(
        thread_id: str,
        owner_id: str,
        owner_type: str,
        file: Any
    ) -> dict:
        ALLOWED_DOC_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".txt"}
        MAX_DOC_SIZE = 25 * 1024 * 1024

        filename = getattr(file, "filename", None) or "attachment"
        ext = os.path.splitext(filename)[1].lower() if filename else ""
        if not ext or ext not in ALLOWED_DOC_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"نوع الملف غير مدعوم. الأنواع المدعومة هي: {', '.join(ALLOWED_DOC_EXTENSIONS)}"
            )

        contents = await file.read()
        if len(contents) > MAX_DOC_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="حجم الملف كبير جداً. الحد الأقصى هو 25 ميجابايت."
            )

        upload_dir = os.path.join(os.getcwd(), "app", "uploads", "attachments")
        os.makedirs(upload_dir, exist_ok=True)
        unique_name = f"{uuid4()}{ext}"
        saved_file_path = os.path.join(upload_dir, unique_name)

        try:
            with open(saved_file_path, "wb") as f:
                f.write(contents)
        except Exception as e:
            logger.exception(f"Failed to save attachment file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="حدث خطأ أثناء حفظ الملف."
            )

        relative_path = f"/uploads/attachments/{unique_name}"
        display_text = f"📄 [ملف مرفق]: {filename}"

        async with db.pool.acquire() as connection:
            await AudioService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            encrypted_content = encrypt_text(display_text)

            async with connection.transaction():
                query = """
                    INSERT INTO chat_messages (
                        thread_id, sender_type, content, audio_file_path
                    )
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                """
                row = await connection.fetchrow(
                    query,
                    UUID(thread_id),
                    "user",
                    encrypted_content,
                    relative_path
                )

                update_thread_query = """
                    UPDATE chat_threads
                    SET message_count = message_count + 1, updated_at = now()
                    WHERE id = $1
                """
                await connection.execute(update_thread_query, UUID(thread_id))

                res = dict(row) if row else None
                if res:
                    res["content"] = display_text
                    res["bento_data"] = AudioService._parse_json(res.get("bento_data"))
                    res["insight_data"] = AudioService._parse_json(res.get("insight_data"))
                return res
