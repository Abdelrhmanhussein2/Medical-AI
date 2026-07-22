# app/services/ai_engine_service.py
import os
import logging
import json
from uuid import UUID
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import HTTPException, status

from app.core.database import db
from app.core.config import settings
from groq import AsyncGroq

logger = logging.getLogger(__name__)

# Constants for configuration (Scalability & Maintainability)
MAX_ITERATIONS = 8
MODEL_NAME = "llama-3.3-70b-versatile"
HISTORY_LIMIT = 20  # Increased limit from 10 to 20 for more context

# Load system prompt template once at import time
PROMPT_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "prompts", "system_prompt.txt"
)

try:
    with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
        SYSTEM_PROMPT_TEMPLATE = f.read()
except Exception as e:
    logger.exception(f"Failed to load system prompt template from {PROMPT_FILE_PATH}")
    SYSTEM_PROMPT_TEMPLATE = ""

def build_system_prompt(today_date: str, patient_info: Optional[Dict[str, Any]] = None) -> str:
    """
    Builds the system prompt by replacing placeholders (Stage 3.2).
    """
    prompt = SYSTEM_PROMPT_TEMPLATE
    prompt = prompt.replace("[TODAY_DATE]", today_date)
    
    patient_context_str = ""
    if patient_info:
        patient_context_str = (
            f"\nالمريض المحدد لهذه الجلسة: الاسم: {patient_info.get('name')}, "
            f"تاريخ الميلاد: {patient_info.get('date_of_birth')}, "
            f"الجنس: {patient_info.get('gender') or 'غير محدد'}."
        )
    prompt = prompt.replace("[PATIENT_CONTEXT]", patient_context_str)
    return prompt

class AIEngineService:
    """
    Handles the agentic completion loop using Groq and dispatches tools.
    """

    @staticmethod
    async def generate_ai_response(thread_id: str, owner_id: str, owner_type: str) -> dict:
        # Import inside method to avoid circular import issues
        from app.services.chat_service import ChatService
        from app.schemes.chat_schema import MessageCreate
        from app.services.ai_tools import get_tool_definitions, ToolExecutor

        try:
            api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
            if not api_key:
                logger.error("Groq API Key is not configured.")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Groq API Key is not configured."
                )
            client = AsyncGroq(api_key=api_key.strip())

            # Get message history (limit raised to HISTORY_LIMIT)
            history = await ChatService.get_messages(thread_id, owner_id, owner_type, limit=HISTORY_LIMIT)
            if not history:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="لا يوجد رسائل للرد عليها."
                )

            # Fetch thread
            thread = await ChatService.get_thread_by_id(thread_id, owner_id, owner_type)

            today_str = datetime.now().strftime("%Y-%m-%d")
            patient_info = None

            # Fetch patient details if attached to thread for Context Anchoring
            if thread and thread.get('patient_id'):
                async with db.pool.acquire() as conn_ctx:
                    patient = await conn_ctx.fetchrow(
                        "SELECT name, date_of_birth, gender FROM patients WHERE id = $1 AND doctor_id = $2",
                        thread['patient_id'], UUID(owner_id)
                    )
                    if patient:
                        patient_info = dict(patient)

            system_instruction = build_system_prompt(today_str, patient_info)
            tools = get_tool_definitions()

            groq_messages = [{"role": "system", "content": system_instruction}]
            for msg in history:
                role = "assistant" if msg["sender_type"] == "ai" else "user"
                content = msg["content"] or ""
                if msg.get("is_audio") and role == "user":
                    content = f"[ملاحظة صوتية من الطبيب]: {content}"
                groq_messages.append({"role": role, "content": content})

            tool_executor = ToolExecutor()

            # Log request details
            user_msg = history[-1]["content"] if history else ""
            if history and history[-1].get("is_audio"):
                user_msg = f"[ملاحظة صوتية]: {user_msg}"
            logger.info(f"\n==================================================")
            logger.info(f"[AI ENGINE] NEW GENERATE REQUEST")
            logger.info(f"[AI ENGINE] Thread ID: {thread_id}")
            logger.info(f"[AI ENGINE] User Query: {user_msg}")
            logger.info(f"==================================================")

            # AI execution loop
            for idx in range(MAX_ITERATIONS):
                logger.info(f"[AI ENGINE] Iteration {idx+1}/{MAX_ITERATIONS} - Sending prompt to LLM...")
                try:
                    response = await client.chat.completions.create(
                        model=MODEL_NAME,
                        messages=groq_messages,
                        tools=tools,
                        tool_choice="auto",
                        temperature=0.0
                    )
                except Exception as groq_err:
                    err_str = str(groq_err).lower()
                    logger.warning(f"Groq tool call exception: {groq_err}")
                    if "tool" in err_str or "400" in err_str:
                        # Fallback: retry without tools to avoid tool-call validation errors
                        response = await client.chat.completions.create(
                            model=MODEL_NAME,
                            messages=groq_messages,
                            temperature=0.0
                        )
                    else:
                        raise groq_err

                response_message = response.choices[0].message
                
                if response_message.tool_calls:
                    logger.info(f"[AI ENGINE] Model decided to call {len(response_message.tool_calls)} tools:")
                    groq_messages.append({
                        "role": "assistant",
                        "content": response_message.content or "",
                        "tool_calls": [t.model_dump() for t in response_message.tool_calls]
                    })
                    
                    has_error = False
                    async with db.pool.acquire() as conn:
                        for tool_call in response_message.tool_calls:
                            fn_name = tool_call.function.name
                            logger.info(f"  ⚡ Executing Tool: {fn_name}")
                            logger.info(f"    Arguments: {tool_call.function.arguments}")
                            try:
                                fn_args = json.loads(tool_call.function.arguments)
                            except Exception:
                                fn_args = {}
                            if not fn_args:
                                fn_args = {}
                                
                            result_data = await tool_executor.dispatch(fn_name, fn_args, owner_id, conn)
                            logger.info(f"    Result: {result_data}")
                            
                            if isinstance(result_data, dict) and result_data.get("status") == "error":
                                has_error = True

                            # UUID validation/sanitization in result returned to LLM
                            # If tool returned an error or status = error, make sure it is explicit
                            groq_messages.append({
                                "role": "tool",
                                "name": fn_name,
                                "tool_call_id": tool_call.id,
                                "content": json.dumps(result_data, ensure_ascii=False)
                            })
                    if has_error:
                        logger.warning(f"[AI ENGINE] Tool returned status='error'. Breaking loop early to prevent hallucinated retry.")
                        break
                else:
                    logger.info(f"[AI ENGINE] Model finished tool calls and returned text response.")
                    break
            
            # If the last response was a tool call (which means we broke early because of an error),
            # we need to make one final call to the LLM to generate the text response explaining the error, forcing it to not call tools again.
            if response_message.tool_calls:
                logger.info(f"[AI ENGINE] Requesting final text response from LLM for the error (forcing text)...")
                try:
                    final_response = await client.chat.completions.create(
                        model=MODEL_NAME,
                        messages=groq_messages,
                        tools=tools,
                        tool_choice="none",
                        temperature=0.0
                    )
                    response_message = final_response.choices[0].message
                except Exception as final_err:
                    logger.exception(f"[AI ENGINE] Error generating final text response: {final_err}")

            ai_text = response_message.content or ""
            if not ai_text:
                ai_text = "لم أتمكن من إنشاء رد. يرجى المحاولة مرة أخرى."

            logger.info(f"[AI ENGINE] Final Response: {ai_text}")
            logger.info(f"==================================================\n")

            ai_message_data = MessageCreate(
                sender_type="ai",
                content=ai_text,
                insight_data=None
            )
            return await ChatService.add_message(thread_id, owner_id, owner_type, ai_message_data)

        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Groq API Error in generate_ai_response: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Groq API Error: {str(e)}"
            )
