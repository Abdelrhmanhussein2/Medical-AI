# app/services/ai_engine_service.py
import os
import re
import logging
import json
from uuid import UUID
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import HTTPException, status

from app.core.database import db
from app.core.config import settings
from groq import AsyncGroq

logger = logging.getLogger(__name__)

# Constants for configuration (Scalability & Maintainability)
MAX_ITERATIONS = 8
MODEL_NAME = "llama-3.3-70b-versatile"
HISTORY_LIMIT = 8  # reduced from 20 → saves ~60% tokens per request

def _dbg(*args):
    msg = " ".join(str(a) for a in args)
    print(f"\033[93m[AI DEBUG]\033[0m {msg}", flush=True)


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

def _parse_groq_failed_generation(failed_gen: str) -> list[dict]:
    """
    Groq sometimes returns a malformed tool call in 'failed_generation'.
    Format: <function=TOOL_NAME {"arg": "val"}</function>
    This parser extracts the tool name and args so we can execute it manually.
    """
    pattern = r'<function\s*=\s*(\w+)\s*(\{.*?\})\s*</function>'
    results = []
    for match in re.finditer(pattern, failed_gen, re.DOTALL):
        fn_name = match.group(1)
        args_str = match.group(2)
        try:
            args = json.loads(args_str)
            results.append({"name": fn_name, "args": args})
        except json.JSONDecodeError:
            try:
                fixed_args_str = args_str.replace("'", '"')
                args = json.loads(fixed_args_str)
                results.append({"name": fn_name, "args": args})
            except Exception:
                logger.warning(f"[AI ENGINE] Could not parse args for {fn_name}: {args_str}")
    return results


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
            f"معرف المريض (patient_id): {patient_info.get('id')}, "
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
        from app.services.ai_tools import ToolExecutor
        from app.services.router import SmartRouter

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

            user_msg = history[-1]["content"] if history else ""
            if history and history[-1].get("is_audio"):
                user_msg = f"[ملاحظة صوتية]: {user_msg}"

            # Fetch thread
            thread = await ChatService.get_thread_by_id(thread_id, owner_id, owner_type)

            today_dt = datetime.now()
            ARABIC_WEEKDAYS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
            today_day_name = ARABIC_WEEKDAYS[today_dt.weekday()]
            today_formatted = f"{today_day_name} {today_dt.strftime('%Y-%m-%d')}"

            calendar_lines = [
                f"تاريخ اليوم: {today_formatted}",
                "جدول التواريخ القادمة لحساب المواعيد بدقة:"
            ]
            for i in range(7):
                d = today_dt + timedelta(days=i)
                w_name = ARABIC_WEEKDAYS[d.weekday()]
                rel_label = "اليوم" if i == 0 else ("غداً" if i == 1 else w_name)
                calendar_lines.append(f"- {w_name} ({rel_label}): {d.strftime('%Y-%m-%d')}")

            today_str = "\n".join(calendar_lines)
            patient_info = None

            # Fetch patient details if attached to thread for Context Anchoring
            if thread and thread.get('patient_id'):
                async with db.pool.acquire() as conn_ctx:
                    patient = await conn_ctx.fetchrow(
                        "SELECT id, name, date_of_birth, gender FROM patients WHERE id = $1 AND doctor_id = $2",
                        thread['patient_id'], UUID(owner_id)
                    )
                    if patient:
                        patient_info = dict(patient)

            system_instruction = build_system_prompt(today_str, patient_info)

            # ── SMART AGENTIC ROUTING ────────────────────────────────────────
            # Three pieces of context are passed to the SmartRouter:
            #   1. current user message   → what the doctor just said
            #   2. last AI message        → what the assistant asked (follow-up)
            #   3. previous user message  → the ORIGINAL intent (e.g. "احجز")
            #      This is critical so the router knows WHY the doctor is now
            #      sending a follow-up like a patient name or phone number.
            last_ai_msg: Optional[str] = None
            previous_user_msg: Optional[str] = None

            # Walk history in reverse to find last AI msg and previous user msg
            for msg in reversed(history[:-1]):  # exclude current message
                sender = msg.get("sender_type")
                content = msg.get("content") or ""
                if not content:
                    continue
                # AI messages are stored as JSON {"type":"text","content":"..."}
                # Extract plain text so the Router can understand the actual meaning
                if sender == "ai":
                    try:
                        parsed = json.loads(content)
                        content = parsed.get("content", content)
                    except (json.JSONDecodeError, AttributeError):
                        pass  # already plain text
                
                if sender == "ai" and last_ai_msg is None:
                    last_ai_msg = content
                elif sender == "user" and previous_user_msg is None:
                    # Smart intent retrieval: Skip short confirmation keywords or phone numbers
                    # to keep the true semantic intent as the previous user context.
                    clean_content = content.strip().lower()
                    # Check if phone number (digits only or with leading plus/zeros)
                    is_phone = re.match(r"^\+?[0-9\u0660-\u0669\u06f0-\u06f9]+$", clean_content) is not None
                    is_short_confirmation = clean_content in [
                        "اه", "نعم", "لا", "تمام", "صح", "ماشي", "الاول", "الأول", "الاولاني", 
                        "الأولاني", "الثاني", "التاني", "yes", "no", "ok", "y", "n"
                    ]
                    # Also skip messages that are too short (less than 4 characters)
                    is_too_short = len(clean_content) < 4
                    
                    if not (is_phone or is_short_confirmation or is_too_short):
                        previous_user_msg = content
                
                if last_ai_msg and previous_user_msg:
                    break

            # Fallback: if all user messages in history were short, grab the last one anyway
            if previous_user_msg is None:
                for msg in reversed(history[:-1]):
                    if msg.get("sender_type") == "user" and msg.get("content"):
                        previous_user_msg = msg["content"]
                        break

            _dbg(f"USER MSG : '{user_msg}'")
            if previous_user_msg:
                _dbg(f"PREV USER: '{previous_user_msg[:80]}{'…' if len(previous_user_msg) > 80 else ''}'")
            if last_ai_msg:
                _dbg(f"LAST AI  : '{last_ai_msg[:80]}{'…' if len(last_ai_msg) > 80 else ''}'")

            tools = await SmartRouter.get_tools_for_query(
                current_user_msg=user_msg,
                last_ai_msg=last_ai_msg,
                previous_user_msg=previous_user_msg,
            )
            if not tools:
                tools = None

            groq_messages = [{"role": "system", "content": system_instruction}]
            for msg in history:
                role = "assistant" if msg["sender_type"] == "ai" else "user"
                content = msg["content"] or ""
                if msg.get("is_audio") and role == "user":
                    content = f"[ملاحظة صوتية من الطبيب]: {content}"
                groq_messages.append({"role": role, "content": content})

            tool_executor = ToolExecutor()

            # Log request details
            logger.info(f"\n==================================================")
            logger.info(f"[AI ENGINE] NEW GENERATE REQUEST")
            logger.info(f"[AI ENGINE] Thread ID: {thread_id}")
            logger.info(f"[AI ENGINE] User Query: {user_msg}")
            logger.info(f"[AI ENGINE] Routed Tools ({len(tools) if tools else 0}): {[t['function']['name'] for t in tools] if tools else []}")
            logger.info(f"==================================================")

            _dbg("══════════════════════════════════════════════════")
            _dbg(f"QUERY    : {user_msg}")
            _dbg(f"MESSAGES : {len(groq_messages)} (system + history)")
            _dbg(f"TOOLS    : {[t['function']['name'] for t in tools] if tools else []}")
            _dbg("══════════════════════════════════════════════════")

            # Token tracking initialization
            total_calls = 0
            accumulated_prompt = 0
            accumulated_completion = 0
            accumulated_total = 0

            # Track executed calls to prevent infinite loops on the same error
            executed_calls = set()

            # AI execution loop
            for idx in range(MAX_ITERATIONS):
                logger.info(f"[AI ENGINE] Iteration {idx+1}/{MAX_ITERATIONS} - Sending prompt to LLM...")
                _dbg(f"--- Iteration {idx+1}/{MAX_ITERATIONS} → calling Groq...")
                try:
                    total_calls += 1
                    comp_kwargs = {
                        "model": MODEL_NAME,
                        "messages": groq_messages,
                        "temperature": 0.0
                    }
                    if tools:
                        comp_kwargs["tools"] = tools
                        comp_kwargs["tool_choice"] = "auto"
                        
                    response = await client.chat.completions.create(**comp_kwargs)
                    if hasattr(response, "usage") and response.usage:
                        accumulated_prompt += response.usage.prompt_tokens
                        accumulated_completion += response.usage.completion_tokens
                        accumulated_total += response.usage.total_tokens
                        logger.info(f"[AI ENGINE - TOKENS] API Call #{total_calls} -> Model: {MODEL_NAME} | Prompt: {response.usage.prompt_tokens} | Completion: {response.usage.completion_tokens} | Total: {response.usage.total_tokens}")
                except Exception as groq_err:
                    groq_err_str = str(groq_err)
                    logger.warning(f"Groq tool call exception: {groq_err}")
                    _dbg(f"⚠️  Groq error: {groq_err_str[:200]}")

                    # Check if it's a transient network/connection error
                    is_transient = (
                        "connection" in groq_err_str.lower() or 
                        "timeout" in groq_err_str.lower() or 
                        "50" in groq_err_str or 
                        "rate_limit" in groq_err_str.lower() or
                        "api_connection" in groq_err_str.lower()
                    )
                    if is_transient:
                        _dbg("🔄 Transient network error detected. Retrying WITH tools in 1.5 seconds...")
                        import asyncio
                        await asyncio.sleep(1.5)
                        try:
                            response = await client.chat.completions.create(**comp_kwargs)
                            if hasattr(response, "usage") and response.usage:
                                accumulated_prompt += response.usage.prompt_tokens
                                accumulated_completion += response.usage.completion_tokens
                                accumulated_total += response.usage.total_tokens
                            # Succeeded! Nullify the error so we don't trigger fallbacks.
                            groq_err = None
                        except Exception as retry_err:
                            _dbg(f"❌ Retry failed: {retry_err}")
                            raise retry_err

                    if groq_err is not None:
                        # ── Recover from tool_use_failed by regex on the raw error string ──
                        recovered = False
                        if "tool_use_failed" in groq_err_str or "failed_generation" in groq_err_str:
                            parsed_calls = _parse_groq_failed_generation(groq_err_str)
                            if parsed_calls:
                                _dbg(f"🔧 Recovered {len(parsed_calls)} tool call(s) from failed_generation")
                                groq_messages.append({
                                    "role": "assistant",
                                    "content": "",
                                    "tool_calls": [
                                        {
                                            "id": f"recovered_{i}",
                                            "type": "function",
                                            "function": {
                                                "name": c["name"],
                                                "arguments": json.dumps(c["args"], ensure_ascii=False)
                                            }
                                        }
                                        for i, c in enumerate(parsed_calls)
                                    ]
                                })
                                has_error = False
                                async with db.pool.acquire() as conn:
                                    for i, call in enumerate(parsed_calls):
                                        fn_name = call["name"]
                                        fn_args = call["args"]
                                        
                                        # Check for duplicate call to prevent infinite loop
                                        call_key = f"{fn_name}:{json.dumps(fn_args, sort_keys=True)}"
                                        if call_key in executed_calls:
                                            logger.warning(f"[AI ENGINE] Duplicate recovered tool call detected: {call_key}. Breaking early.")
                                            has_error = True
                                            break
                                        executed_calls.add(call_key)

                                        _dbg(f"   ⚡ Executing (recovered): {fn_name} | Args: {fn_args}")
                                        result_data = await tool_executor.dispatch(fn_name, fn_args, owner_id, conn)
                                        _dbg(f"      Result: {str(result_data)[:200]}")
                                        if isinstance(result_data, dict) and result_data.get("status") == "error":
                                            has_error = True
                                        elif isinstance(result_data, dict) and result_data.get("status") == "success":
                                            if fn_name == "add_new_patient" and result_data.get("patient_id"):
                                                new_pid = UUID(result_data["patient_id"])
                                                await conn.execute(
                                                    "UPDATE chat_threads SET patient_id = $1 WHERE id = $2",
                                                    new_pid, UUID(thread_id)
                                                )
                                                logger.info(f"[AI ENGINE] Associated new patient {new_pid} with thread {thread_id}")
                                        groq_messages.append({
                                            "role": "tool",
                                            "name": fn_name,
                                            "tool_call_id": f"recovered_{i}",
                                            "content": json.dumps(result_data, ensure_ascii=False)
                                        })
                                recovered = True
                                continue  # next iteration → final LLM text response

                        if not recovered:
                            # Only retry without tools if it is a tool validation / 400 Bad Request error
                            is_tool_validation_error = "tool" in groq_err_str.lower() or "400" in groq_err_str or "validation" in groq_err_str.lower()
                            if is_tool_validation_error:
                                _dbg("↩️  Last resort: retry WITHOUT tools...")
                                response = await client.chat.completions.create(
                                    model=MODEL_NAME,
                                    messages=groq_messages,
                                    temperature=0.0
                                )
                                if hasattr(response, "usage") and response.usage:
                                    accumulated_prompt += response.usage.prompt_tokens
                                    accumulated_completion += response.usage.completion_tokens
                                    accumulated_total += response.usage.total_tokens
                                    logger.info(f"[AI ENGINE - TOKENS] Retry Call #{total_calls} -> Model: {MODEL_NAME} | Prompt: {response.usage.prompt_tokens} | Completion: {response.usage.completion_tokens} | Total: {response.usage.total_tokens}")
                            else:
                                raise groq_err


                response_message = response.choices[0].message

                # ── DEBUG: what did the LLM decide? ──────────────────────
                if response_message.tool_calls:
                    _dbg(f"✅ LLM DECISION → TOOL CALL(S): {[tc.function.name for tc in response_message.tool_calls]}")
                else:
                    _dbg(f"💬 LLM DECISION → TEXT RESPONSE (no tool call)")
                    _dbg(f"   Content preview: {(response_message.content or '')[:120]}")
                # ─────────────────────────────────────────────────────────

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
                            _dbg(f"   ⚡ Executing: {fn_name}")
                            _dbg(f"      Args: {tool_call.function.arguments}")
                            try:
                                fn_args = json.loads(tool_call.function.arguments)
                            except Exception:
                                fn_args = {}
                            if not fn_args:
                                fn_args = {}
                                
                            # Check for duplicate call to prevent infinite loop
                            call_key = f"{fn_name}:{json.dumps(fn_args, sort_keys=True)}"
                            if call_key in executed_calls:
                                logger.warning(f"[AI ENGINE] Duplicate tool call detected: {call_key}. Breaking early.")
                                has_error = True
                                break
                            executed_calls.add(call_key)

                            result_data = await tool_executor.dispatch(fn_name, fn_args, owner_id, conn)
                            logger.info(f"    Result: {result_data}")
                            _dbg(f"      Result: {str(result_data)[:200]}")

                            if isinstance(result_data, dict) and result_data.get("status") == "error":
                                has_error = True
                            elif isinstance(result_data, dict) and result_data.get("status") == "success":
                                if fn_name == "add_new_patient" and result_data.get("patient_id"):
                                    new_pid = UUID(result_data["patient_id"])
                                    await conn.execute(
                                        "UPDATE chat_threads SET patient_id = $1 WHERE id = $2",
                                        new_pid, UUID(thread_id)
                                    )
                                    logger.info(f"[AI ENGINE] Associated new patient {new_pid} with thread {thread_id}")

                            groq_messages.append({
                                "role": "tool",
                                "name": fn_name,
                                "tool_call_id": tool_call.id,
                                "content": json.dumps(result_data, ensure_ascii=False)
                            })
                    # We no longer break the main iteration loop unconditionally on has_error.
                    # This allows the LLM to see the validation/business error (like invalid UUID or slot conflict)
                    # and self-correct or ask the doctor for another slot.
                    pass
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
                    if hasattr(final_response, "usage") and final_response.usage:
                        accumulated_prompt += final_response.usage.prompt_tokens
                        accumulated_completion += final_response.usage.completion_tokens
                        accumulated_total += final_response.usage.total_tokens
                        logger.info(f"[AI ENGINE - TOKENS] Final Error Call #{total_calls} -> Model: {MODEL_NAME} | Prompt: {final_response.usage.prompt_tokens} | Completion: {final_response.usage.completion_tokens} | Total: {final_response.usage.total_tokens}")
                except Exception as final_err:
                    logger.exception(f"[AI ENGINE] Error generating final text response: {final_err}")

            ai_text = response_message.content or ""
            if not ai_text:
                ai_text = "لم أتمكن من إنشاء رد. يرجى المحاولة مرة أخرى."

            logger.info(f"[AI ENGINE] Final Response: {ai_text}")
            logger.info(f"\n==================================================")
            logger.info(f"[AI ENGINE - TRANSACTION COMPLETED SUMMARY]")
            logger.info(f"  - Total API Calls: {total_calls}")
            logger.info(f"  - Total Prompt (Input) Tokens: {accumulated_prompt}")
            logger.info(f"  - Total Completion (Output) Tokens: {accumulated_completion}")
            logger.info(f"  - Total Accumulated Tokens: {accumulated_total}")
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
