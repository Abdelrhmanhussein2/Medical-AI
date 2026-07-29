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
        # Fallback to Groq LLM if GROQ_API_KEY is available
        if settings.GROQ_API_KEY:
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                
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
  ],
  "extracted_diseases": "Any chronic diseases mentioned by the patient or doctor in this session (e.g., 'السكري'، 'الضغط') or null if none mentioned",
  "extracted_habits": "Any lifestyle habits mentioned in this session (e.g., 'التدخين'، 'الرياضة') or null if none mentioned"
}"""

                user_prompt = f"""Patient Name: {patient_name}

Session Transcript:
{transcript}

Please analyze this consultation and return the structured JSON summary."""

                response = await client.chat.completions.create(
                    model="llama-3.3-70b-specdec",
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
                result["prompt_tokens"] = response.usage.prompt_tokens
                result["completion_tokens"] = response.usage.completion_tokens
                result["model"] = "llama-3.3-70b-specdec"
                print(f"\033[92m[AI TOKEN USAGE] Model: llama-3.3-70b-specdec | Tokens Consumed: {response.usage.total_tokens}\033[0m", flush=True)
                return result
            except Exception as e:
                print(f"Groq primary summarization failed, trying fallback model: {e}")
                try:
                    response = await client.chat.completions.create(
                        model="llama-3.1-8b-instant",
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
                    result["prompt_tokens"] = response.usage.prompt_tokens
                    result["completion_tokens"] = response.usage.completion_tokens
                    result["model"] = "llama-3.1-8b-instant"
                    print(f"\033[92m[AI TOKEN USAGE] Model: llama-3.1-8b-instant | Tokens Consumed: {response.usage.total_tokens}\033[0m", flush=True)
                    return result
                except Exception as ex:
                    print(f"Groq fallback summarization failed: {ex}")
                    return _mock_summary_response(transcript)
        else:
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
  ],
  "extracted_diseases": "Any chronic diseases mentioned by the patient or doctor in this session (e.g., 'السكري'، 'الضغط') or null if none mentioned",
  "extracted_habits": "Any lifestyle habits mentioned in this session (e.g., 'التدخين'، 'الرياضة') or null if none mentioned"
}"""

        user_prompt = f"""Patient Name: {patient_name}

Session Transcript:
{transcript}

Please analyze this consultation and return the structured JSON summary."""

        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
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
        result["prompt_tokens"] = response.usage.prompt_tokens
        result["completion_tokens"] = response.usage.completion_tokens
        result["model"] = settings.OPENAI_MODEL
        print(f"\033[92m[OPENAI TOKEN USAGE] Model: {settings.OPENAI_MODEL} | Tokens Consumed: {response.usage.total_tokens}\033[0m", flush=True)
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


async def generate_global_patient_summary(sessions_history: str, patient_name: str) -> str:
    """
    توليد ملخص طبي عام وتراكمي للمريض بناءً على سجل زياراته السابقة.
    """
    system_prompt = """You are an expert clinical assistant.
Analyze the patient's consultation history and formulate a concise, structured general medical summary.
This summary should capture chronic diseases, allergies, history of surgeries, and overall clinical trajectory.
Keep it professional, highly structured, and write it in the same language as the history (mostly Arabic).
IMPORTANT: Do NOT use markdown syntax (do NOT use asterisks like '**' or hashes like '###' or symbols for styling). Write in clean plain text with titles and newlines for spacing instead.
Do not include any conversational filler, return ONLY the medical summary text."""

    user_prompt = f"""اسم المريض: {patient_name}
سجل الزيارات الطبية السابقة:
{sessions_history}

يرجى صياغة ملخص طبي عام وأساسي شامل وموجز لهذا المريض."""

    def clean_text(text: str) -> str:
        return text.replace("**", "").replace("###", "").replace("##", "").replace("#", "").strip()

    from app.core.config import settings
    
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
        if settings.GROQ_API_KEY:
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                response = await client.chat.completions.create(
                    model="llama-3.3-70b-specdec",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1500
                )
                return clean_text(response.choices[0].message.content)
            except Exception as e:
                print(f"Groq global summary failed: {e}")
                try:
                    response = await client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        temperature=0.3,
                        max_tokens=1500
                    )
                    return clean_text(response.choices[0].message.content)
                except Exception as ex:
                    print(f"Groq fallback global summary failed: {ex}")
                    return "تمت مناقشة حالة المريض خلال الزيارات السابقة."
        else:
            return "تمت مناقشة حالة المريض خلال الزيارات السابقة."
            
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=1500
        )
        return clean_text(response.choices[0].message.content)
    except Exception as e:
        print(f"OpenAI global summary failed: {e}")
        return "تمت مناقشة حالة المريض خلال الزيارات السابقة."
