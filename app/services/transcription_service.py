# app/services/transcription_service.py
import os
import time
import logging
import asyncio
from typing import Optional
from openai import AsyncOpenAI, APIStatusError, APITimeoutError, APIConnectionError, RateLimitError
from app.core.config import settings

logger = logging.getLogger(__name__)

SHARED_MEDICAL_PROMPT = (
    "Transcribe the audio accurately in Arabic.\n\n"
    "This is a medical conversation between a doctor and a patient.\n\n"
    "Requirements:\n"
    "- Preserve the original spoken content.\n"
    "- Do not summarize or paraphrase.\n"
    "- Preserve medical terminology.\n"
    "- Preserve medication names, dosages, numbers, units, laboratory tests, diseases, symptoms, and examination names.\n"
    "- Preserve Arabic speech as Arabic.\n"
    "- Do not translate Arabic into English.\n"
    "- Do not add medical information that was not spoken.\n"
    "- Do not infer or invent missing words.\n"
    "- Keep the transcription as faithful to the audio as possible."
)

class TranscriptionService:
    """
    Centralized Transcription Service for the entire application.
    """

    @staticmethod
    async def _transcribe_model(
        client: AsyncOpenAI,
        filename: str,
        audio_bytes: bytes,
        model_name: str,
        max_retries: int = 3
    ) -> str:
        delay = 1.0
        for attempt in range(max_retries + 1):
            try:
                transcription = await client.audio.transcriptions.create(
                    file=(filename, audio_bytes),
                    model=model_name,
                    response_format="text",
                    language="ar",
                    prompt=SHARED_MEDICAL_PROMPT
                )
                return str(transcription).strip()
            except (RateLimitError, APITimeoutError, APIConnectionError) as exc:
                if attempt == max_retries:
                    logger.error(f"OpenAI transcription failed on {model_name} after {max_retries} retries: {exc}")
                    raise exc
                logger.warning(f"Transient error on {model_name}: {exc}. Retrying in {delay}s...")
                await asyncio.sleep(delay)
                delay *= 2.0
            except APIStatusError as exc:
                if exc.status_code >= 500 and attempt < max_retries:
                    logger.warning(f"Transient HTTP {exc.status_code} error on {model_name}: {exc}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    delay *= 2.0
                else:
                    raise exc
            except Exception as exc:
                raise exc

    @staticmethod
    async def transcribe_audio(
        audio_bytes: bytes,
        filename: str,
        custom_api_key: Optional[str] = None
    ) -> str:
        """
        Centralized method to transcribe audio with exact model configurations, logging, and error handling.
        """
        api_key = custom_api_key or settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            raise ValueError("OpenAI API Key is not configured.")

        # Extract metadata safely for logging
        audio_size = len(audio_bytes)
        audio_format = os.path.splitext(filename)[1].lower() if filename else ".webm"
        
        client = AsyncOpenAI(api_key=api_key.strip())
        
        start_time = time.time()
        success = False
        final_model = "gpt-transcribe"
        
        try:
            # Try primary model first: gpt-transcribe
            try:
                result = await TranscriptionService._transcribe_model(
                    client, filename, audio_bytes, "gpt-transcribe"
                )
                success = True
                return result
            except Exception as exc:
                # If model is not supported (HTTP 400), try fallback to mini
                is_model_error = isinstance(exc, APIStatusError) and exc.status_code == 400
                if is_model_error:
                    logger.info("gpt-transcribe not available, falling back to gpt-4o-mini-transcribe")
                    final_model = "gpt-4o-mini-transcribe"
                    try:
                        result = await TranscriptionService._transcribe_model(
                            client, filename, audio_bytes, "gpt-4o-mini-transcribe"
                        )
                        success = True
                        return result
                    except Exception as fallback_exc:
                        is_fallback_model_error = isinstance(fallback_exc, APIStatusError) and fallback_exc.status_code == 400
                        if is_fallback_model_error:
                            logger.info("gpt-4o-mini-transcribe not available, falling back to whisper-1")
                            final_model = "whisper-1"
                            result = await TranscriptionService._transcribe_model(
                                client, filename, audio_bytes, "whisper-1"
                            )
                            success = True
                            return result
                        raise fallback_exc
                raise exc
        finally:
            duration = time.time() - start_time
            # Standardized Logging: Never log transcript plaintext, key, audio data, or patient data
            logger.info(
                f"[TRANSCRIPTION BOUNDARY] Model: {final_model} | "
                f"Format: {audio_format} | "
                f"Size: {audio_size} bytes | "
                f"Duration: {duration:.2f}s | "
                f"Success: {success}"
            )
