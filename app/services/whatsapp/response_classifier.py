import json
import logging
from typing import Optional, Literal
from app.core.config import settings

logger = logging.getLogger("whatsapp_response_classifier")

class ResponseClassifier:
    def __init__(self, openai_client = None):
        """
        AI Classifier for patient responses.
        
        Args:
            openai_client: An instance of openai.AsyncOpenAI (optional, injected for testing/DI).
        """
        self.openai_client = openai_client
        self._initialized = False

    async def _init_client(self):
        if self.openai_client or self._initialized:
            return
        
        if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your"):
            try:
                from openai import AsyncOpenAI
                self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
        self._initialized = True

    async def classify(
        self,
        text: str,
        visit_notes: Optional[str] = None
    ) -> Literal["fine", "mild_pain", "severe_pain"]:
        """
        Classifies patient's response to checkup into:
        - 'fine': patient is feeling well / recovering.
        - 'mild_pain': patient is feeling unwell or has mild/moderate pain.
        - 'severe_pain': patient is experiencing severe, intolerable pain or emergency.
        
        Uses OpenAI gpt-4o-mini if configured, falls back to keyword matching otherwise.
        """
        if not text:
            return "fine"

        await self._init_client()

        if self.openai_client:
            try:
                system_prompt = (
                    "You are a clinical AI agent. Analyze the patient's reply to a follow-up check-in "
                    "message (sent 24h after their doctor visit). Classify their state into one of these three categories:\n"
                    "1. 'fine': Patient indicates they are feeling better, good, fine, or recovering (e.g., 'الحمد لله كويس', 'تمام بخير').\n"
                    "2. 'mild_pain': Patient is still tired, has some pain, discomfort, mild symptoms, or questions, but not in immediate distress (e.g., 'لسه تعبان شوية', 'في شوية وجع').\n"
                    "3. 'severe_pain': Patient is in severe pain, high fever, emergency condition, extreme suffering, or stating things are very bad (e.g., 'تعبان جداً بموت', 'الألم لا يحتمل', 'حالة طارئة').\n\n"
                    "IMPORTANT: You must return a valid JSON object with the key 'status' holding one of the values: 'fine', 'mild_pain', or 'severe_pain'. "
                    "Do not include any other markdown or text in the response."
                )

                user_prompt = f"Patient WhatsApp Response: \"{text}\"\n"
                if visit_notes:
                    user_prompt += f"Context (Doctor Notes from yesterday's visit): \"{visit_notes}\"\n"
                user_prompt += "\nReturn JSON with key 'status':"

                response = await self.openai_client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.0,
                    max_tokens=100
                )
                
                content = response.choices[0].message.content
                result = json.loads(content)
                status = result.get("status")
                if status in ("fine", "mild_pain", "severe_pain"):
                    logger.info(f"OpenAI classified patient response as: {status}")
                    return status
            except Exception as e:
                logger.error(f"OpenAI classification failed, falling back to keyword rules: {e}")

        # Fallback to rules-based classifier
        return self._classify_by_rules(text)

    def _classify_by_rules(self, text: str) -> Literal["fine", "mild_pain", "severe_pain"]:
        text_lower = text.lower().strip()
        
        # Severe pain keywords
        severe_keywords = [
            "بموت", "طوارئ", "تعبان جدا", "الم شديد", "وجع شديد", "ألم شديد",
            "لا يحتمل", "غير محتمل", "شديد جدا", "صعب جدا", "حرارة مرتفعة جدا",
            "نزيف", "مستشفى", "الحقوني", "موت", "اموت"
        ]
        # Fine keywords
        fine_keywords = [
            "الحمد لله", "الحمدلله", "بخير", "تمام", "كويس", "منيح",
            "بأحسن حال", "مستقر", "زي الفل", "تحسنت", "احسن", "طيب",
            "بخير الحمد", "ماشي الحال", "عال العال"
        ]
        # Mild pain keywords
        mild_keywords = [
            "تعبان", "وجع", "الم", "ألم", "تعبانة", "سخونة", "حرارة",
            "مش كويس", "مو تمام", "لسه تعب", "شوية", "مغص", "صداع",
            "ترجيع", "استفراغ", "كحة"
        ]

        # Order of checks:
        # 1. Severe pain first (safety priority)
        for kw in severe_keywords:
            if kw in text_lower:
                return "severe_pain"
                
        # 2. Mild pain next
        for kw in mild_keywords:
            if kw in text_lower:
                # Double check if there's "الحمد لله" or "بخير" which might neutralize it
                # e.g., "الحمد لله تعب خفيف" -> mild_pain
                # e.g., "الحمد لله انا بخير" -> fine
                if "الحمد" in text_lower or "بخير" in text_lower:
                    if "جدا" in text_lower or "شديد" in text_lower:
                        return "severe_pain"
                return "mild_pain"

        # 3. Fine check
        for kw in fine_keywords:
            if kw in text_lower:
                return "fine"

        # Default fallback: if they say anything else, we treat it as fine or mild_pain.
        # Let's treat it as fine by default to avoid spamming the doctor, but we could return "mild_pain"
        # if the text contains characters and is not empty. Let's return "fine" to be safe.
        return "fine"
