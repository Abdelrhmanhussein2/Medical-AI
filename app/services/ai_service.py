"""
AI Service — يتعامل مع OpenAI لتلخيص الجلسات وإنشاء SOAP Notes
"""
import json
from typing import Optional
from app.core.config import settings


async def summarize_session_transcript(transcript: str, patient_name: str = "المريض") -> dict:
    """
    يرسل النص الكامل للجلسة لـ OpenAI ويرجع ملخص منظم.
    
    Returns:
        dict with keys: summary, soap_note (S/O/A/P), patient_summary, prescriptions, tasks
    """
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
        # Fallback mock response if no API key set
        return _mock_summary_response(transcript)
    
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        system_prompt = """You are a highly skilled medical AI assistant helping doctors summarize clinical consultations.
You will receive a raw transcript of a doctor-patient session and must return a structured JSON response.

IMPORTANT: Always respond in the SAME language as the transcript. If the transcript is in Arabic, respond in Arabic.

Return ONLY valid JSON with this exact structure:
{
  "summary": "Brief 2-3 sentence overview of the session",
  "soap_note": {
    "S": "Subjective - patient's complaints and history",
    "O": "Objective - examination findings",
    "A": "Assessment - diagnosis or differential",
    "P": "Plan - treatment and follow-up"
  },
  "patient_summary": "Simple summary written for patient understanding (avoid medical jargon)",
  "prescriptions": [
    {"medication": "name", "dose": "dose", "frequency": "frequency", "duration": "duration"}
  ],
  "tasks": [
    "Follow up task 1",
    "Follow up task 2"
  ]
}"""

        user_prompt = f"""Patient Name: {patient_name}

Session Transcript:
{transcript}

Please analyze this consultation and return the structured JSON summary."""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2000
        )
        
        content = response.choices[0].message.content
        result = json.loads(content)
        result["tokens_used"] = response.usage.total_tokens
        result["model"] = "gpt-4o-mini"
        return result
        
    except Exception as e:
        # إذا فشل الـ AI نرجع mock
        print(f"AI summarization failed: {e}")
        return _mock_summary_response(transcript)


def _mock_summary_response(transcript: str) -> dict:
    """Mock response للاختبار بدون API key"""
    return {
        "summary": "جلسة استشارية مع المريض. تم مناقشة الأعراض والتاريخ المرضي وتقديم الخطة العلاجية المناسبة.",
        "soap_note": {
            "S": "يشكو المريض من أعراض تم مناقشتها خلال الجلسة. تاريخ طبي قيد التقييم.",
            "O": "لم يتم إجراء فحص سريري خلال هذه الجلسة الافتراضية.",
            "A": "تقييم أولي بناءً على الأعراض المذكورة.",
            "P": "متابعة الأعراض وإجراء الفحوصات المطلوبة عند الحاجة."
        },
        "patient_summary": "تمت مناقشة حالتك الصحية مع الطبيب. يرجى الالتزام بالتعليمات الطبية والتواصل في حال ظهور أي أعراض جديدة.",
        "prescriptions": [],
        "tasks": [
            "متابعة الأعراض",
            "إجراء الفحوصات المطلوبة",
            "جدولة موعد متابعة"
        ],
        "tokens_used": 0,
        "model": "mock"
    }
