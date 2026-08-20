import os
import logging
import json
from uuid import UUID
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
from openai import AsyncOpenAI

from app.core.database import db
from app.core.config import settings
from app.services.chat_service import ChatService
from app.schemes.chat_schema import MessageCreate
from app.services.ai_tools import ToolExecutor
from app.services.ai_tools.schemas import get_admin_tool_definitions

logger = logging.getLogger(__name__)

# Constants
MAX_ITERATIONS = 5
HISTORY_LIMIT = 5

# Load system prompt
PROMPT_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "prompts", "admin_system_prompt.txt"
)

try:
    with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
        ADMIN_SYSTEM_PROMPT_TEMPLATE = f.read()
except Exception as e:
    logger.exception(f"Failed to load admin system prompt template from {PROMPT_FILE_PATH}")
    ADMIN_SYSTEM_PROMPT_TEMPLATE = (
        "أنت مساعد ذكاء اصطناعي إداري لنظام SBR AI. استخدم الأدوات المتاحة لجلب التقارير والإحصائيات."
    )


class AdminAIEngineService:
    @staticmethod
    async def generate_ai_response(thread_id: str, admin_id: str) -> dict:
        """
        Executes the agentic loop for Admin AI chat using OpenAI gpt-4o-mini and admin tools.
        """
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
            logger.error("OpenAI API Key is not configured for Admin AI.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI API Key is not configured. Admin AI requires OpenAI."
            )

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.strip())
        model_to_use = settings.OPENAI_MODEL or "gpt-4o-mini"

        # Fetch chat history
        history = await ChatService.get_messages(thread_id, admin_id, "admin", limit=HISTORY_LIMIT)
        if not history:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="لا توجد رسائل للرد عليها."
            )

        # Build System Prompt
        try:
            with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
                prompt_template = f.read()
        except Exception:
            prompt_template = ADMIN_SYSTEM_PROMPT_TEMPLATE

        today_dt = datetime.now()
        today_formatted = today_dt.strftime('%Y-%m-%d %H:%M')
        system_instruction = prompt_template.replace("[TODAY_DATE]", today_formatted)

        messages = [{"role": "system", "content": system_instruction}]
        for msg in history:
            role = "assistant" if msg["sender_type"] == "ai" else "user"
            messages.append({"role": role, "content": msg["content"] or ""})

        # Load Admin Tool schemas
        tools = get_admin_tool_definitions()
        tool_executor = ToolExecutor()
        executed_calls = set()

        total_calls = 0
        final_text = ""

        # Loop to handle iterative tool calls
        for idx in range(MAX_ITERATIONS):
            logger.info(f"[ADMIN AI] Iteration {idx+1}/{MAX_ITERATIONS} calling OpenAI...")
            try:
                total_calls += 1
                comp_kwargs = {
                    "model": model_to_use,
                    "messages": messages,
                    "temperature": 0.0
                }
                if tools:
                    comp_kwargs["tools"] = tools
                    comp_kwargs["tool_choice"] = "auto"

                response = await client.chat.completions.create(**comp_kwargs)
            except Exception as llm_err:
                logger.error(f"[ADMIN AI] LLM Completion error: {llm_err}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"فشل الاتصال بسيرفر الذكاء الاصطناعي: {str(llm_err)}"
                )

            response_message = response.choices[0].message
            
            # If LLM decides to call tools
            if response_message.tool_calls:
                logger.info(f"[ADMIN AI] Model decided to call {len(response_message.tool_calls)} tools:")
                # We need to append the model response to the messages
                messages.append({
                    "role": "assistant",
                    "content": response_message.content or "",
                    "tool_calls": [t.model_dump() for t in response_message.tool_calls]
                })

                async with db.pool.acquire() as conn:
                    for tool_call in response_message.tool_calls:
                        fn_name = tool_call.function.name
                        logger.info(f"  ⚡ Executing Admin Tool: {fn_name}")
                        try:
                            fn_args = json.loads(tool_call.function.arguments)
                        except Exception:
                            fn_args = {}

                        call_key = f"{fn_name}:{json.dumps(fn_args, sort_keys=True)}"
                        if call_key in executed_calls:
                            logger.warning(f"[ADMIN AI] Duplicate tool call skipped: {call_key}")
                            result_data = {"status": "error", "message": "Duplicate tool call detected."}
                        else:
                            executed_calls.add(call_key)
                            # Dispatch to ToolExecutor which handles mapping the tools
                            result_data = await tool_executor.dispatch(fn_name, fn_args, admin_id, conn, role="admin")

                        # Append tool response
                        messages.append({
                            "role": "tool",
                            "name": fn_name,
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(result_data, ensure_ascii=False)
                        })
            else:
                # final text response reached
                final_text = response_message.content or ""
                break
        else:
            # Reached max iterations without final text, generate a fallback text
            final_text = "انتهى وقت المعالجة، تفضل بطلبك مرة أخرى وسأحاول تلخيص النتائج بدقة."

        # ── Save AI Response to Database ──
        if final_text:
            ai_msg_data = MessageCreate(
                sender_type="ai",
                content=final_text
            )
            saved_msg = await ChatService.add_message(thread_id, admin_id, "admin", ai_msg_data)
            return saved_msg

        return {"status": "error", "message": "لم يتمكن المساعد من توليد رد."}
