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

    async def generate_suggested_fields(self, template_name: str) -> List[Dict[str, str]]:
        """
        Generates suggested clinical field names and default values based on the template name using LLM.
        """
        if not template_name or not template_name.strip():
            return []

        prompt = (
            f"أنت طبيب متخصص. مهمتك اقتراح من 4 إلى 7 حقول طبية عملية لقالب كشف طبي باسم: \"{template_name}\".\n\n"
            f"لكل حقل:\n"
            f"1. اسم الحقل (label): قصير ومباشر (مثل: خطوات العلاج، الفحص السريري، التشخيص).\n"
            f"2. القيمة الافتراضية (defaultValue): اكتب محتوى مفصّل وكامل يصلح كنقطة بداية للطبيب. \n"
            f"   - إذا كان الحقل عن علاج: اكتب الخطوات العلاجية المنطقية بالتفصيل (أدوية، جرعات، مدة، تعليمات).\n"
            f"   - إذا كان الحقل عن تأهيل: اكتب التمارين والخطوات التأهيلية مرتبة.\n"
            f"   - إذا كان الحقل عن شكوى أو تاريخ مرضي: اكتب الأسئلة الطبية المهمة أو النمط الشائع.\n"
            f"   - لا تكتب كلمتين فقط - اكتب على الأقل 3 إلى 8 جمل أو نقاط مفيدة.\n\n"
            f"أعد النتيجة كـ JSON Array فقط بالعربية:\n"
            f"[\n"
            f"  {{\"label\": \"اسم الحقل\", \"defaultValue\": \"المحتوى التفصيلي هنا...\"}},\n"
            f"  {{\"label\": \"اسم الحقل 2\", \"defaultValue\": \"المحتوى التفصيلي هنا...\"}}\n"
            f"]\n"
            f"لا تضع أي نص خارج الـ JSON."
        )

        try:
            from openai import AsyncOpenAI
            from app.core.config import settings
            import os
            import json

            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
                return [{"label": "الشكوى الرئيسية", "defaultValue": ""}, {"label": "التاريخ الطبي", "defaultValue": ""}]

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.strip())
            model_to_use = settings.OPENAI_MODEL or "gpt-4o-mini"

            response = await client.chat.completions.create(
                model=model_to_use,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=2000
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()

            fields = json.loads(content)
            if isinstance(fields, list):
                result = []
                for f in fields[:10]:
                    if isinstance(f, dict) and f.get("label"):
                        result.append({
                            "label": str(f.get("label")).strip(),
                            "defaultValue": str(f.get("defaultValue") or "").strip()
                        })
                return result
            return []
        except Exception as e:
            logger.error(f"Error generating suggested fields via AI: {e}")
            return [{"label": "الشكوى الرئيسية", "defaultValue": ""}, {"label": "التاريخ الطبي", "defaultValue": ""}]

    async def extract_fields_from_input(self, text: Optional[str], file: Optional[Any]) -> List[Dict[str, str]]:
        """
        Transcribes the audio file if provided, and extracts clinical fields and default values from the text or transcription using LLM.
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
                if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your"):
                    from app.services.transcription_service import TranscriptionService
                    with open(saved_file_path, "rb") as audio_file:
                        audio_bytes = audio_file.read()
                    transcribed = await TranscriptionService.transcribe_audio(
                        audio_bytes, unique_name
                    )
                if transcribed:
                    input_text = transcribed
            except Exception as e:
                logger.error(f"Error transcribing template helper audio: {e}")

        if not input_text or not input_text.strip():
            return []

        # 2. Extract fields from input_text
        prompt = (
            f"أنت طبيب متخصص. قرأت الوصف التالي من طبيب يريد إنشاء قالب كشف طبي:\n"
            f"\"{input_text}\"\n\n"
            f"مهمتك:\n"
            f"1. استخرج أسماء الحقول الطبية المطلوبة من الوصف.\n"
            f"2. لكل حقل اكتب قيمة افتراضية مفصّلة ومفيدة كنقطة بداية للطبيب:\n"
            f"   - إذا كان عن علاج: اكتب الخطوات العلاجية بالتفصيل (أدوية، جرعات، مدة، تعليمات).\n"
            f"   - إذا كان عن تأهيل: اكتب التمارين والخطوات مرتبة.\n"
            f"   - إذا كان عن شكوى: اكتب الأسئلة أو الأنماط الشائعة.\n"
            f"   - لا تكتب كلمتين فقط - اكتب على الأقل 3 إلى 8 جمل أو نقاط مفيدة.\n\n"
            f"أعد النتيجة كـ JSON Array فقط بالعربية:\n"
            f"[\n"
            f"  {{\"label\": \"اسم الحقل\", \"defaultValue\": \"المحتوى التفصيلي هنا...\"}},\n"
            f"  {{\"label\": \"اسم الحقل 2\", \"defaultValue\": \"المحتوى التفصيلي هنا...\"}}\n"
            f"]\n"
            f"لا تضع أي نص خارج الـ JSON."
        )

        try:
            from openai import AsyncOpenAI
            from app.core.config import settings
            import os
            import json

            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
                return []

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.strip())
            model_to_use = settings.OPENAI_MODEL or "gpt-4o-mini"

            response = await client.chat.completions.create(
                model=model_to_use,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=2000
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()

            fields = json.loads(content)
            if isinstance(fields, list):
                result = []
                for f in fields[:10]:
                    if isinstance(f, dict) and f.get("label"):
                        result.append({
                            "label": str(f.get("label")).strip(),
                            "defaultValue": str(f.get("defaultValue") or "").strip()
                        })
                return result
            return []
        except Exception as e:
            logger.error(f"Error extracting template fields: {e}")
            return []


    async def extract_patient_fill_values(self, doctor_id: UUID, template_id: UUID, transcript: str) -> Dict[str, str]:
        """
        Extracts clinical note values for the fields of a template based on the session transcript.
        """
        template = await self.get_template(template_id, doctor_id)
        fields = template.get("fields", [])
        if not fields:
            return {}

        field_labels = [f.get("label") for f in fields if f.get("label")]
        if not field_labels:
            return {}

        prompt = (
            f"مهمتك هي استخراج معلومات سريرية مناسبة لكل حقل من الحقول الطبية المحددة بناءً على نص الاستشارة أو النص المكتوب أدناه:\n"
            f"نص الاستشارة:\n"
            f"\"\"\"{transcript}\"\"\"\n\n"
            f"الحقول المطلوب تعبئتها:\n"
            f"{', '.join([f' - {label}' for label in field_labels])}\n\n"
            f"تعليمات الاستخراج:\n"
            f"1. استخلص القيمة المقابلة لكل حقل من نص الاستشارة فقط. حافظ على دقة المعلومات.\n"
            f"2. إذا لم تكن هناك معلومات كافية أو مذكورة لحقل معين، أرجع قيمته كـ \"\" (نص فارغ) أو \"غير محدد\".\n"
            f"3. يجب إرجاع النتيجة كـ JSON Object صالح ومباشر، حيث المفاتيح هي أسماء الحقول بدقة، والقيم هي النصوص المستخلصة.\n"
            f"مثال:\n"
            f"{{\n"
            f"  \"{field_labels[0]}\": \"قيمة الحقل السريرية المستخلصة\"\n"
            f"}}\n"
            f"لا تضع أي تعليبات أو نصوص خارج كود الـ JSON، أعد كود الـ JSON فقط."
        )

        try:
            from openai import AsyncOpenAI
            from app.core.config import settings
            import os
            import json

            if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
                return {label: "" for label in field_labels}

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.strip())
            model_to_use = settings.OPENAI_MODEL or "gpt-4o-mini"

            response = await client.chat.completions.create(
                model=model_to_use,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()

            extracted = json.loads(content)
            if isinstance(extracted, dict):
                result = {}
                for label in field_labels:
                    val = extracted.get(label, "")
                    if val is None:
                        val = ""
                    result[label] = str(val).strip()
                return result
            return {label: "" for label in field_labels}
        except Exception as e:
            logger.error(f"Error extracting patient fill values via AI: {e}")
            return {label: "" for label in field_labels}

template_service = TemplateService()
