"""
AI Service — يتعامل مع OpenAI لتلخيص الجلسات وإنشاء SOAP Notes
"""
import json
from typing import Optional
from app.core.config import settings


async def summarize_session_transcript(transcript: str, patient_name: str = "المريض", summary_format: str = "soap") -> dict:
    """
    يرسل النص الكامل للجلسة لـ OpenAI ويرجع ملخص منظم.

    Returns:
       dict with keys: summary, soap_note, patient_summary, prescriptions, tasks
    """
    is_multi = summary_format == "multi_section"

    soap_structure = """{
    "S": "Subjective - patient's complaints and history",
    "O": "Objective - examination findings",
    "A": "Assessment - diagnosis or differential",
    "P": "Plan - treatment and follow-up"
  }"""

    multi_structure = """{
    "Chief Complaint": "الشكوى الرئيسية للمريض والأعراض الأساسية بالتفصيل",
    "History of Present Illness": "تاريخ وتفاصيل المرض الحالي وتطور الأعراض",
    "Past Medical History": "الأمراض والمشاكل الصحية المزمنة والسابقة",
    "Past Surgical History": "العمليات الجراحية السابقة وتواريخها إن وجدت",
    "Past Obstetric History": "تاريخ الحمل والولادة للمريضة إن كان مناسباً، وإلا اكتب لا ينطبق",
    "Family History": "الأمراض الوراثية والمشاكل الصحية في العائلة",
    "Social History": "التاريخ الاجتماعي للمريض وعاداته اليومية والمهنية",
    "Allergies": "أي حساسية يعاني منها المريض للأدوية أو الأطعمة",
    "Current Medications": "الأدوية التي يتناولها المريض حالياً وجرعاتها",
    "Immunizations": "التطعيمات واللقاحات السابقة والتاريخ التحصيني",
    "Vitals": "العلامات الحيوية (درجة الحرارة، الضغط، النبض، التنفس) إن ذكرت",
    "Physical Exam": "نتائج الفحص الإكلينيكي والسريري المذكورة",
    "Lab Results": "نتائج التحاليل والفحوصات المخبرية المذكورة أو المطلوبة",
    "Imaging Results": "نتائج الأشعة والسونار والرنين المذكورة أو المطلوبة",
    "Assessment & Plan": "التقييم الطبي العام والخطة العلاجية المقترحة والتوصيات",
    "Visit Diagnosis 1": "التشخيص الطبي الأول والرئيسي للزيارة",
    "Visit Diagnosis 2": "التشخيص الطبي الثاني أو التفريقي للزيارة إن وجد",
    "Prescription": "الأدوية الموصوفة للمريض في هذه الزيارة بالتفصيل",
    "Appointments": "المواعيد القادمة وجدول المتابعة المقترح",
    "Visit Diagnoses Suggestions": "مقترحات تشخيصية إضافية ونصائح طبية للمستقبل"
  }"""

    selected_structure = multi_structure if is_multi else soap_structure

    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
        return _mock_summary_response(transcript)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        system_prompt = f"""You are a highly skilled medical AI assistant helping doctors summarize clinical consultations.
You will receive a raw transcript of a doctor-patient session and must return a structured JSON response.

IMPORTANT: Always respond in the SAME language as the transcript. If the transcript is in Arabic, respond in Arabic.

Return ONLY valid JSON with this exact structure:
{{
  "summary": "Brief 2-3 sentence overview of the session",
  "soap_note": {selected_structure},
  "patient_summary": "Simple summary written for patient understanding (avoid medical jargon)",
  "prescriptions": [],
  "tasks": [
    "Follow up task 1",
    "Follow up task 2"
  ],
  "extracted_diseases": "Any chronic diseases mentioned by the patient or doctor in this session (e.g., 'السكري'، 'الضغط') or null if none mentioned",
  "extracted_habits": "Any lifestyle habits mentioned in this session (e.g., 'التدخين'، 'الرياضة') or null if none mentioned"
}}

- Do NOT extract or recommend any prescriptions. Keep the "prescriptions" array completely empty [].
"""

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


async def format_patient_instructions(raw_text: str, patient_name: str = "المريض", language: str = "ar") -> str:
    """
    يأخذ ملاحظات الطبيب الخام (مكتوبة أو محوّلة من صوت) ويصيغها بأسلوب
    واضح وبسيط ومناسب للمريض لفهمها بسهولة.
    """
    is_arabic = language == "ar"

    system_prompt = """You are a medical communication specialist who helps doctors communicate clearly with patients.
Your task is to take raw doctor notes/dictation and rewrite them as clear, warm, easy-to-understand patient instructions.

Rules:
- Use simple everyday language, NOT medical jargon
- Be warm, empathetic and encouraging
- Use bullet points or numbered lists for instructions
- If the doctor mentioned medications, include clear dosing instructions
- If the doctor mentioned follow-up, include it clearly
- Write in the SAME language as the input (Arabic or English)
- Do NOT add any information that was not mentioned by the doctor
- Do NOT use markdown symbols like ** or ### — use plain text only
- Start directly with the instructions, no preamble"""

    if is_arabic:
        user_prompt = f"""الطبيب أعطى التعليمات التالية للمراجع {patient_name}:

{raw_text}

أعد صياغة هذه التعليمات بأسلوب واضح وبسيط يفهمه المراجع بسهولة، مع الحفاظ على كل المعلومات المذكورة."""
    else:
        user_prompt = f"""The doctor gave the following instructions for patient {patient_name}:

{raw_text}

Rewrite these instructions in clear, simple language that the patient can easily understand, keeping all mentioned information."""

    def clean_text(text: str) -> str:
        return text.replace("**", "").replace("###", "").replace("##", "").replace("#", "").strip()

    from app.core.config import settings

    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
        return raw_text

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.4,
            max_tokens=1000
        )
        return clean_text(response.choices[0].message.content)
    except Exception as e:
        print(f"OpenAI format_patient_instructions failed: {e}")
        return raw_text
