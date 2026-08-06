import logging
from uuid import UUID
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.services.templates.template_repository import TemplateRepository
from app.services.templates.patient_fills_repository import PatientFillsRepository
from app.core.database import db

logger = logging.getLogger("template_service")

class TemplateService:
    def __init__(self, template_repo=None, fills_repo=None):
        self.template_repo = template_repo or TemplateRepository()
        self.fills_repo = fills_repo or PatientFillsRepository()

    async def create_template(self, doctor_id: UUID, name: str, fields: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Creates a template, validates fields limit (<= 10), and registers fields in autocomplete registry.
        """
        if not name or not name.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="اسم القالب مطلوب")

        if len(fields) > 10:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="يمكنك إضافة 10 حقول كحد أقصى")

        # Validate each field has label
        for field in fields:
            if not field.get("label") or not field.get("label").strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="جميع حقول القالب يجب أن تحتوي على اسم")

        # Upsert fields to registry for autocomplete reference
        field_labels = [f["label"].strip() for f in fields]
        try:
            await self.template_repo.upsert_registry_fields(field_labels)
        except Exception as e:
            logger.error(f"Failed to upsert fields to global registry: {e}")

        # Create template in DB
        try:
            return await self.template_repo.create(doctor_id, name.strip(), fields)
        except Exception as e:
            if "unique constraint" in str(e).lower() or "uniqueviolationerror" in e.__class__.__name__.lower():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="لديك قالب آخر بنفس الاسم بالفعل")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"حدث خطأ أثناء حفظ القالب: {e}")

    async def update_template(self, template_id: UUID, doctor_id: UUID, name: str, fields: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Updates a template, validating fields limit (<= 10) and registering fields.
        """
        if not name or not name.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="اسم القالب مطلوب")

        if len(fields) > 10:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="يمكنك إضافة 10 حقول كحد أقصى")

        # Validate fields
        for field in fields:
            if not field.get("label") or not field.get("label").strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="جميع حقول القالب يجب أن تحتوي على اسم")

        field_labels = [f["label"].strip() for f in fields]
        try:
            await self.template_repo.upsert_registry_fields(field_labels)
        except Exception as e:
            logger.error(f"Failed to upsert fields: {e}")

        updated = await self.template_repo.update(template_id, doctor_id, name.strip(), fields)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="القالب غير موجود أو غير مصرح لك بالوصول إليه")
        return updated

    async def list_templates(self, doctor_id: UUID) -> List[Dict[str, Any]]:
        """
        Returns all templates for a specific doctor.
        """
        return await self.template_repo.list_by_doctor(doctor_id)

    async def get_template(self, template_id: UUID, doctor_id: UUID) -> Dict[str, Any]:
        """
        Retrieves a template by ID, raising 404 if not found or unauthorized.
        """
        template = await self.template_repo.get_by_id(template_id, doctor_id)
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="القالب غير موجود أو غير مصرح لك بالوصول إليه")
        return template

    async def delete_template(self, template_id: UUID, doctor_id: UUID) -> None:
        """
        Deletes a template.
        """
        # Verify ownership first
        await self.get_template(template_id, doctor_id)
        deleted = await self.template_repo.delete(template_id, doctor_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="فشل حذف القالب")

    async def search_registry(self, query: str) -> List[str]:
        """
        Searches autocomplete registry.
        """
        if not query or not query.strip():
            return []
        return await self.template_repo.search_field_registry(query.strip())

    async def save_patient_fill(
        self,
        doctor_id: UUID,
        patient_id: UUID,
        template_id: UUID,
        filled_data: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Validates ownership of patient and template by the doctor, then saves/updates the fill data.
        """
        # 1. Verify template exists and belongs to doctor
        template = await self.get_template(template_id, doctor_id)
        template_name = template["name"]

        # 2. Verify patient belongs to doctor (or doctor_id is NULL/unassigned in DB)
        async with db.pool.acquire() as conn:
            patient_check = await conn.fetchrow(
                "SELECT 1 FROM patients WHERE id = $1 AND (doctor_id = $2 OR doctor_id IS NULL)",
                patient_id, doctor_id
            )
            if not patient_check:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="المريض غير موجود أو غير مصرح لك بمتابعته")

        # 3. Upsert fill data
        try:
            return await self.fills_repo.upsert_fill(patient_id, doctor_id, template_id, template_name, filled_data)
        except Exception as e:
            logger.error(f"Error saving patient template fill: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"فشل حفظ بيانات القالب للمريض: {e}")

    async def get_patient_fills(self, patient_id: UUID, doctor_id: UUID) -> List[Dict[str, Any]]:
        """
        Retrieves all filled templates for a patient, checked against doctor ownership.
        """
        async with db.pool.acquire() as conn:
            patient_check = await conn.fetchrow(
                "SELECT 1 FROM patients WHERE id = $1 AND (doctor_id = $2 OR doctor_id IS NULL)",
                patient_id, doctor_id
            )
            if not patient_check:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="المريض غير موجود أو غير مصرح لك بمتابعته")

        return await self.fills_repo.get_patient_fills(patient_id, doctor_id)

    async def generate_suggested_fields(self, template_name: str) -> List[str]:
        """
        Generates suggested clinical field names based on the template name using LLM.
        """
        if not template_name or not template_name.strip():
            return []

        prompt = (
            f"مهمتك هي اقتراح من 3 إلى 7 أسماء حقول طبية سريرية مناسبة لقالب كشف طبي يحمل الاسم: \"{template_name}\".\n"
            f"أمثلة لحقول شائعة: 'الشكوى الرئيسية'، 'التاريخ المرضي'، 'الفحص السريري'، 'العلامات الحيوية'، 'التوصيات العلاجية'، 'التشخيص المقترح'.\n"
            f"يجب أن تكون الأسماء قصيرة وموجزة جداً ومناسبة للتخصص.\n"
            f"الرجاء إعادة النتيجة كـ JSON Array من النصوص باللغة العربية فقط كالتالي:\n"
            f"[\"حقل 1\", \"حقل 2\", \"حقل 3\"]\n"
            f"لا تضع أي تعليقات أو نصوص خارج المصفوفة، أعد المصفوفة فقط."
        )

        try:
            from openai import AsyncOpenAI
            from groq import AsyncGroq
            from app.core.config import settings
            import os

            use_openai = settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your")
            if use_openai:
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.strip())
                model_to_use = settings.OPENAI_MODEL or "gpt-4o-mini"
            else:
                api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
                if not api_key:
                    return ["الشكوى الرئيسية", "التاريخ الطبي", "الفحص السريري", "العلاج والتعليمات"]
                client = AsyncGroq(api_key=api_key.strip())
                from app.services.ai_engine_service import MODEL_NAME
                model_to_use = MODEL_NAME

            response = await client.chat.completions.create(
                model=model_to_use,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=200
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            
            import json
            fields = json.loads(content)
            if isinstance(fields, list):
                return [str(f).strip() for f in fields[:10] if f]
            return []
        except Exception as e:
            logger.error(f"Error generating suggested fields via AI: {e}")
            return ["الشكوى الرئيسية", "التاريخ الطبي", "الفحص السريري", "العلاج والتعليمات"]

    async def extract_fields_from_input(self, text: Optional[str], file: Optional[Any]) -> List[str]:
        """
        Transcribes the audio file if provided, and extracts clinical fields from the text or transcription using LLM.
        """
        input_text = text or ""
        
        # 1. Transcribe audio if provided
        if file:
            try:
                from app.core.config import settings
                import os
                from uuid import uuid4

                use_openai = settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your")
                filename = getattr(file, "filename", None) or "recording.webm"
                ext = os.path.splitext(filename)[1].lower() or ".webm"
                contents = await file.read()
                
                upload_dir = os.path.join(os.getcwd(), "app", "uploads", "audio")
                os.makedirs(upload_dir, exist_ok=True)
                unique_name = f"template_suggest_{uuid4()}{ext}"
                saved_file_path = os.path.join(upload_dir, unique_name)
                
                with open(saved_file_path, "wb") as f:
                    f.write(contents)

                transcribed = ""
                if use_openai:
                    from openai import AsyncOpenAI
                    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.strip())
                    with open(saved_file_path, "rb") as audio_file:
                        transcription = await client.audio.transcriptions.create(
                            file=(unique_name, audio_file.read()),
                            model="whisper-1",
                            response_format="text"
                        )
                        transcribed = str(transcription).strip()
                else:
                    api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
                    if api_key:
                        from groq import AsyncGroq
                        client = AsyncGroq(api_key=api_key.strip())
                        with open(saved_file_path, "rb") as audio_file:
                            transcription = await client.audio.transcriptions.create(
                                file=(unique_name, audio_file.read()),
                                model="whisper-large-v3",
                                response_format="text"
                            )
                            transcribed = str(transcription).strip()
                if transcribed:
                    input_text = transcribed
            except Exception as e:
                logger.error(f"Error transcribing template helper audio: {e}")

        if not input_text or not input_text.strip():
            return []

        # 2. Extract fields from input_text
        prompt = (
            f"مهمتك هي استخراج وتصفية أسماء حقول طبية سريرية مناسبة (من 1 إلى 10 حقول) من الوصف أو النص التالي:\n"
            f"\"{input_text}\"\n\n"
            f"تعليمات:\n"
            f"1. إذا كان النص يحتوي على أسماء حقول مباشرة (مثلاً: 'عايز الضغط والسكر والنبض والوزن')، فاستخرجها: ['ضغط الدم', 'مستوى السكر', 'نبضات القلب', 'الوزن'].\n"
            f"2. إذا كان النص عبارة عن تسجيل صوتي تم تحويله لنص وبطريقة غير دقيقة تماماً، قم بتصحيح الكلمات إملائياً واستخرج الحقول الطبية المقصودة منها.\n"
            f"3. يجب أن تكون أسماء الحقول مختصرة جداً (من كلمة إلى ثلاث كلمات بحد أقصى للحقل الواحد).\n"
            f"4. يجب إعادة النتيجة كـ JSON Array من النصوص فقط باللغة العربية فقط كالتالي:\n"
            f"[\"حقل 1\", \"حقل 2\", \"حقل 3\"]\n"
            f"لا تكتب أي مقدمات أو تعليقات خارج المصفوفة، أعد المصفوفة فقط."
        )

        try:
            from openai import AsyncOpenAI
            from groq import AsyncGroq
            from app.core.config import settings
            import os

            use_openai = settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your")
            if use_openai:
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.strip())
                model_to_use = settings.OPENAI_MODEL or "gpt-4o-mini"
            else:
                api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
                if not api_key:
                    return []
                client = AsyncGroq(api_key=api_key.strip())
                from app.services.ai_engine_service import MODEL_NAME
                model_to_use = MODEL_NAME

            response = await client.chat.completions.create(
                model=model_to_use,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=250
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()
            
            import json
            fields = json.loads(content)
            if isinstance(fields, list):
                return [str(f).strip() for f in fields[:10] if f]
            return []
        except Exception as e:
            logger.error(f"Error extracting template fields: {e}")
            return []

template_service = TemplateService()
