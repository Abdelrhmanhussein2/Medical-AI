from app.core.database import db
from app.core.encryption import encrypt_text, decrypt_bytes
from app.schemes.chat_schema import ThreadCreate, ThreadUpdate, MessageCreate
from fastapi import HTTPException, status
from uuid import UUID
from datetime import datetime
from typing import List, Optional, Any
import json

class ChatService:

    @staticmethod
    async def _assert_thread_owner(connection, thread_id: str, owner_id: str, owner_type: str):
        """
        أداة تحقق أمنية للتأكد من ملكية الجلسة قبل السماح بأي عملية قراءة أو كتابة.
        تمنع ثغرات الـ IDOR بالكامل.
        """
        query = """
            SELECT id FROM chat_threads
            WHERE id = $1 AND owner_id = $2 AND owner_type = $3
        """
        row = await connection.fetchrow(query, UUID(thread_id), UUID(owner_id), owner_type)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ليس لديك صلاحية للوصول إلى هذه المحادثة أو المحادثة غير موجودة."
            )

    @staticmethod
    def _parse_json(val):
        if val is None:
            return None
        if isinstance(val, str):
            try:
                return json.loads(val)
            except Exception:
                return val
        return val

    @staticmethod
    async def create_thread(owner_id: str, owner_type: str, data: ThreadCreate) -> dict:
        query = """
            INSERT INTO chat_threads (owner_id, owner_type, title, dept)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        """
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow(
                query,
                UUID(owner_id),
                owner_type,
                data.title,
                data.dept
            )
            return dict(row) if row else None

    @staticmethod
    async def get_my_threads(owner_id: str, owner_type: str) -> List[dict]:
        query = """
            SELECT * FROM chat_threads
            WHERE owner_id = $1 AND owner_type = $2
            ORDER BY is_pinned DESC, updated_at DESC
        """
        async with db.pool.acquire() as connection:
            rows = await connection.fetch(query, UUID(owner_id), owner_type)
            return [dict(r) for r in rows]

    @staticmethod
    async def get_thread_by_id(thread_id: str, owner_id: str, owner_type: str) -> dict:
        async with db.pool.acquire() as connection:
            await ChatService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            query = "SELECT * FROM chat_threads WHERE id = $1"
            row = await connection.fetchrow(query, UUID(thread_id))
            return dict(row) if row else None

    @staticmethod
    async def update_thread(thread_id: str, owner_id: str, owner_type: str, data: ThreadUpdate) -> dict:
        async with db.pool.acquire() as connection:
            # 1. التحقق من الصلاحية
            await ChatService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            
            # 2. بناء الاستعلام ديناميكياً
            fields = []
            values = []
            if data.title is not None:
                fields.append(f"title = ${len(values) + 2}")
                values.append(data.title)
            if data.is_pinned is not None:
                fields.append(f"is_pinned = ${len(values) + 2}")
                values.append(data.is_pinned)
                
            if not fields:
                # لا توجد تعديلات
                row = await connection.fetchrow("SELECT * FROM chat_threads WHERE id = $1", UUID(thread_id))
                return dict(row) if row else None
                
            query = f"""
                UPDATE chat_threads
                SET {", ".join(fields)}, updated_at = now()
                WHERE id = $1
                RETURNING *
            """
            row = await connection.fetchrow(query, UUID(thread_id), *values)
            return dict(row) if row else None

    @staticmethod
    async def delete_thread(thread_id: str, owner_id: str, owner_type: str) -> bool:
        async with db.pool.acquire() as connection:
            await ChatService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            query = "DELETE FROM chat_threads WHERE id = $1"
            result = await connection.execute(query, UUID(thread_id))
            return "DELETE 1" in result

    @staticmethod
    async def add_message(thread_id: str, owner_id: str, owner_type: str, data: MessageCreate) -> dict:
        async with db.pool.acquire() as connection:
            # 1. التحقق من الملكية
            await ChatService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            
            # 2. تشفير محتوى الرسالة
            encrypted_content = encrypt_text(data.content)
            
            # 3. تجهيز حقول الـ JSON
            bento_json = json.dumps(data.bento_data) if data.bento_data is not None else None
            insight_json = json.dumps(data.insight_data) if data.insight_data is not None else None
            
            # 4. إدراج الرسالة وتحديث العداد في معاملة واحدة (Transaction)
            async with connection.transaction():
                query = """
                    INSERT INTO chat_messages (
                        thread_id, sender_type, content, bento_data, 
                        insight_data, actions_data, is_audio, audio_duration
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                """
                row = await connection.fetchrow(
                    query,
                    UUID(thread_id),
                    data.sender_type,
                    encrypted_content,
                    bento_json,
                    insight_json,
                    data.actions_data,
                    data.is_audio,
                    data.audio_duration
                )
                
                # تحديث عداد الرسائل وتوقيت الجلسة لتصدر النتائج
                update_thread_query = """
                    UPDATE chat_threads
                    SET message_count = message_count + 1, updated_at = now()
                    WHERE id = $1
                """
                await connection.execute(update_thread_query, UUID(thread_id))
                
                res = dict(row) if row else None
                if res:
                    res["content"] = data.content
                    res["bento_data"] = ChatService._parse_json(res["bento_data"])
                    res["insight_data"] = ChatService._parse_json(res["insight_data"])
                return res

    @staticmethod
    async def process_audio_message(
        thread_id: str,
        owner_id: str,
        owner_type: str,
        file: Any,
        audio_duration: Optional[Any] = 0.0
    ) -> dict:
        import os
        from uuid import uuid4
        from app.core.config import settings
        from groq import AsyncGroq

        api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Groq API Key is not configured."
            )

        upload_dir = os.path.join(os.getcwd(), "app", "uploads", "audio")
        os.makedirs(upload_dir, exist_ok=True)

        ext = os.path.splitext(file.filename)[1] if getattr(file, "filename", None) else ".webm"
        if not ext:
            ext = ".webm"
        unique_name = f"{uuid4()}{ext}"
        saved_file_path = os.path.join(upload_dir, unique_name)

        contents = await file.read()
        with open(saved_file_path, "wb") as f:
            f.write(contents)

        relative_audio_path = f"/uploads/audio/{unique_name}"

        transcription_text = ""
        try:
            client = AsyncGroq(api_key=api_key.strip())
            with open(saved_file_path, "rb") as audio_file:
                transcription = await client.audio.transcriptions.create(
                    file=(unique_name, audio_file.read()),
                    model="whisper-large-v3",
                    language="ar",
                    response_format="text"
                )
                transcription_text = str(transcription).strip()
        except Exception as e:
            print(f"Error transcribing audio with Groq Whisper: {e}")
            transcription_text = "[تسجيل صوتي]"

        if not transcription_text:
            transcription_text = "[تسجيل صوتي]"

        duration_val = 0.0
        if audio_duration is not None:
            try:
                duration_val = float(audio_duration)
            except Exception:
                duration_val = 0.0

        async with db.pool.acquire() as connection:
            await ChatService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            encrypted_content = encrypt_text(transcription_text)

            async with connection.transaction():
                query = """
                    INSERT INTO chat_messages (
                        thread_id, sender_type, content, is_audio, audio_duration, audio_file_path
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                """
                row = await connection.fetchrow(
                    query,
                    UUID(thread_id),
                    "user",
                    encrypted_content,
                    True,
                    str(duration_val),
                    relative_audio_path
                )

                update_thread_query = """
                    UPDATE chat_threads
                    SET message_count = message_count + 1, updated_at = now()
                    WHERE id = $1
                """
                await connection.execute(update_thread_query, UUID(thread_id))

                res = dict(row) if row else None
                if res:
                    res["content"] = transcription_text
                    res["bento_data"] = ChatService._parse_json(res.get("bento_data"))
                    res["insight_data"] = ChatService._parse_json(res.get("insight_data"))
                return res

    @staticmethod
    async def get_messages(thread_id: str, owner_id: str, owner_type: str, limit: int = 50, before: Optional[datetime] = None) -> List[dict]:
        async with db.pool.acquire() as connection:
            # 1. التحقق من الملكية
            await ChatService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            
            # 2. بناء استعلام جلب الرسائل مع دعم الـ Cursor Pagination لحماية الأداء
            if before:
                query = """
                    SELECT * FROM chat_messages
                    WHERE thread_id = $1 AND created_at < $2
                    ORDER BY created_at DESC
                    LIMIT $3
                """
                rows = await connection.fetch(query, UUID(thread_id), before, limit)
            else:
                query = """
                    SELECT * FROM chat_messages
                    WHERE thread_id = $1
                    ORDER BY created_at DESC
                    LIMIT $2
                """
                rows = await connection.fetch(query, UUID(thread_id), limit)
                
            results = []
            for r in rows:
                msg = dict(r)
                # فك تشفير المحتوى
                msg["content"] = decrypt_bytes(msg["content"])
                msg["bento_data"] = ChatService._parse_json(msg["bento_data"])
                msg["insight_data"] = ChatService._parse_json(msg["insight_data"])
                results.append(msg)
            
            # نعيد ترتيب الرسائل تصاعدياً لتعرض بشكل صحيح في واجهة الشات (من الأقدم للأحدث)
            results.reverse()
            return results

    @staticmethod
    async def delete_message(message_id: str, thread_id: str, owner_id: str, owner_type: str) -> bool:
        async with db.pool.acquire() as connection:
            await ChatService._assert_thread_owner(connection, thread_id, owner_id, owner_type)
            async with connection.transaction():
                query = "DELETE FROM chat_messages WHERE id = $1 AND thread_id = $2"
                result = await connection.execute(query, UUID(message_id), UUID(thread_id))
                
                # تقليل عداد الرسائل بالجلسة
                if "DELETE 1" in result:
                    update_thread_query = """
                        UPDATE chat_threads
                        SET message_count = GREATEST(0, message_count - 1)
                        WHERE id = $1
                    """
                    await connection.execute(update_thread_query, UUID(thread_id))
                    return True
                return False


    @staticmethod
    async def generate_ai_response(thread_id: str, owner_id: str, owner_type: str) -> dict:
        try:
            import os
            from app.core.config import settings
            from groq import AsyncGroq

            api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Groq API Key is not configured."
                )
            client = AsyncGroq(api_key=api_key.strip())

            # Get message history
            history = await ChatService.get_messages(thread_id, owner_id, owner_type, limit=10)
            if not history:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="لا يوجد رسائل للرد عليها."
                )

            # Fetch thread
            thread = await ChatService.get_thread_by_id(thread_id, owner_id, owner_type)

            from datetime import datetime
            today_str = datetime.now().strftime("%Y-%m-%d")
            system_parts = [
                f"أنت مساعد طبي ذكي ضمن منصة SBR AI تساعد الطبيب في إدارة عيادته وتحليل الحالات. تاريخ اليوم هو {today_str}. "
                "تجيب باللغة العربية دائماً. لديك أدوات للوصول لبيانات العيادة فاستخدمها عند الحاجة. "
                "لا تخترع بيانات - استخدم الأدوات دائماً للحصول على المعلومات الحقيقية.\n"
                "تعليمات هامة جداً بخصوص حجز المواعيد وإضافة البيانات:\n"
                "1. إياك أن تفترض وقتاً أو تاريخاً من عندك (مثلا لا تفترض الساعة 12:00 إذا لم تُذكر). إذا طلب المستخدم حجز موعد ولم يحدد الوقت بالضبط، يجب عليك أن تسأله (متى تفضل الحجز؟) قبل استدعاء الأداة.\n"
                "2. إذا طلب المستخدم حجز موعد لمريض (مثل محمد) وقمت بالبحث عنه ولم تجده، إياك أن تقوم بالحجز لمريض آخر (مثل المريض المحدد في الجلسة الحالية). في هذه الحالة، أخبر المستخدم أن المريض غير موجود واطلب منه تسجيله كمريض جديد أولاً.\n"
                "3. إذا طلب المستخدم تنفيذ إجراء ولم يقدم كل البيانات المطلوبة، إياك أن تخترع أي بيانات وهمية. اسأله أولاً عن البيانات الناقصة. مثال: إذا طلب إضافة مريض ولم يعطك رقم هاتفه، اسأله: (ما هو رقم هاتف المريض؟) قبل استدعاء الأداة.\n"
                "4. ركز دائماً وبدقة شديدة على الطلب الأخير للمستخدم. إذا طلب مريضاً باسم معين (مثل علي)، إياك أن تستخدم اسماً من محادثة سابقة (مثل محمد). لا تكرر إجاباتك السابقة بشكل أعمى.\n"
                "5. عندما تقوم بسحب بيانات من قاعدة البيانات (مثل ملف المريض، أو جدول المواعيد، أو التقارير)، إياك أن تعرض البيانات على شكل JSON خام للمستخدم. قم بصياغتها دائماً في شكل نصي مرتب ومنسق باللغة العربية باستخدام Markdown (نقاط، خطوط عريضة، أو جداول).\n"
                "6. إذا قمت بالبحث عن مريض ووجدت أكثر من مريض، يجب عليك التوقف وسؤال المستخدم: (لقد وجدت أكثر من مريض، أيهم تقصد؟) واعرض له أسماءهم وأرقام هواتفهم ليختار، ولا تختر مريضاً عشوائياً أبداً.\n"
                "7. تنبيه مهم جداً: إياك أن تستدعي أداة تتطلب patient_id (مثل get_patient_visits أو book_appointment) بالتوازي في نفس الخطوة مع أداة search_my_patients! استدعِ search_my_patients أولاً، وانتظر النتيجة للحصول على الـ patient_id المكون من UUID حقيقي، ثم استدعِ الأداة التالية. وإذا كان طلب المستخدم صراحةً إضافة مريض جديد، استدعِ (add_new_patient) مباشرة دون بحث.\n"
                "تعليمات هامة جداً لصياغة الرد:\n"
                "يجب أن يكون ردك دائماً بصيغة JSON صحيحة (Valid JSON) بناءً على نوع الرد.\n"
                "إذا كان الرد يحتوي على إحصائيات، استخدم هذا التنسيق (ويجب أن تكون كل المفاتيح في الـ data باللغة العربية):\n"
                "{\n"
                '  "type": "stats",\n'
                '  "title": "إحصائيات العيادة هذا الشهر",\n'
                '  "data": {\n'
                '    "عدد المرضى": 2,\n'
                '    "عدد المواعيد": 1\n'
                '  }\n'
                "}\n\n"
                "تأكد دائماً أن المفاتيح داخل الـ data مترجمة بالكامل إلى العربية حتى يفهمها الطبيب.\n\n"
                "إذا كان الرد نصياً عادياً، استخدم هذا التنسيق (ويمكنك استخدام Markdown بداخل الـ content):\n"
                "{\n"
                '  "type": "text",\n'
                '  "content": "نص الرد هنا..."\n'
                "}\n\n"
                "تنبيه خطير جداً: يجب أن ترجع الرد كـ JSON نقي فقط (RAW JSON) بدون أي فواصل أو Markdown Blocks حوله (مثل ```json). إياك أن تستخدم ```json."
            ]

            async with db.pool.acquire() as conn_ctx:
                if thread and thread.get('patient_id'):
                    patient = await conn_ctx.fetchrow(
                        "SELECT name, date_of_birth, gender FROM patients WHERE id = $1",
                        thread['patient_id']
                    )
                    if patient:
                        system_parts.append(
                            f"\nالمريض المحدد لهذه الجلسة: الاسم: {patient['name']}, "
                            f"تاريخ الميلاد: {patient['date_of_birth']}, الجنس: {patient['gender'] or 'غير محدد'}."
                        )

            system_instruction = " ".join(system_parts)

            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": "search_my_patients",
                        "description": "ابحث عن مريض أو أكثر في قاعدة بيانات العيادة بالاسم أو رقم الهاتف.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "اسم المريض أو جزء منه أو رقم هاتفه للبحث"
                                }
                            },
                            "required": ["query"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_patient_visits",
                        "description": "استرجع زيارات المريض السابقة والتشخيصات (يتطلب رقم المريض)",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "patient_id": {
                                    "type": "string",
                                    "description": "الرقم التعريفي (UUID) للمريض"
                                }
                            },
                            "required": ["patient_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_my_appointments",
                        "description": "احصل على جدول المواعيد الخاص بك في فترة محددة",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "date_from": {
                                    "type": "string",
                                    "description": "تاريخ البداية (YYYY-MM-DD)"
                                },
                                "date_to": {
                                    "type": "string",
                                    "description": "تاريخ النهاية (YYYY-MM-DD)"
                                }
                            },
                            "required": ["date_from", "date_to"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_clinic_stats",
                        "description": "احصل على إحصائيات عامة للعيادة (عدد المرضى، الزيارات، الدخل، إلخ)",
                        "parameters": {
                            "type": "object",
                            "properties": {}
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "book_appointment",
                        "description": "حجز موعد لمريض في العيادة. يجب الحصول على patient_id أولاً باستخدام search_my_patients.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "patient_id": {
                                    "type": "string",
                                    "description": "الرقم التعريفي (UUID) للمريض المراد الحجز له"
                                },
                                "appointment_date": {
                                    "type": "string",
                                    "description": "تاريخ الموعد (YYYY-MM-DD)"
                                },
                                "appointment_time": {
                                    "type": "string",
                                    "description": "وقت الموعد (HH:MM)"
                                },
                                "description": {
                                    "type": "string",
                                    "description": "سبب الزيارة أو تفاصيل إضافية (اختياري)"
                                }
                            },
                            "required": ["patient_id", "appointment_date", "appointment_time"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "add_new_patient",
                        "description": "إضافة مريض جديد إلى قاعدة بيانات العيادة.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "اسم المريض بالكامل"
                                },
                                "phone": {
                                    "type": "string",
                                    "description": "رقم هاتف المريض"
                                },
                                "date_of_birth": {
                                    "type": "string",
                                    "description": "تاريخ الميلاد (YYYY-MM-DD) (اختياري)"
                                },
                                "gender": {
                                    "type": "string",
                                    "description": "الجنس: ذكر أو أنثى (اختياري)"
                                }
                            },
                            "required": ["name"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "delete_patient",
                        "description": "حذف مريض من قاعدة بيانات العيادة نهائياً. يجب البحث عن المريض أولاً باستخدام search_my_patients للحصول على الـ patient_id.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "patient_id": {
                                    "type": "string",
                                    "description": "معرف المريض (UUID) المراد حذفه"
                                }
                            },
                            "required": ["patient_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "cancel_appointment",
                        "description": "إلغاء موعد محجوز. ابحث أولاً عن المواعيد باستخدام get_my_appointments.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "appointment_id": {
                                    "type": "string",
                                    "description": "معرف الموعد (UUID) المراد إلغاؤه"
                                }
                            },
                            "required": ["appointment_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "reschedule_appointment",
                        "description": "تغيير تاريخ أو وقت موعد محجوز. يجب تحديد الموعد القديم والتاريخ/الوقت الجديد.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "appointment_id": {
                                    "type": "string",
                                    "description": "معرف الموعد (UUID) المراد تعديله"
                                },
                                "new_date": {
                                    "type": "string",
                                    "description": "التاريخ الجديد بصيغة YYYY-MM-DD"
                                },
                                "new_time": {
                                    "type": "string",
                                    "description": "الوقت الجديد بصيغة HH:MM (24 ساعة)"
                                }
                            },
                            "required": ["appointment_id", "new_date", "new_time"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "update_appointment_status",
                        "description": "تحديث حالة موعد (مثل: completed بعد الزيارة، أو no_show إذا لم يحضر المريض).",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "appointment_id": {
                                    "type": "string",
                                    "description": "معرف الموعد (UUID)"
                                },
                                "new_status": {
                                    "type": "string",
                                    "enum": ["confirmed", "completed", "no_show"],
                                    "description": "الحالة الجديدة: confirmed (مؤكد)، completed (مكتمل)، no_show (لم يحضر)"
                                }
                            },
                            "required": ["appointment_id", "new_status"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "add_visit_record",
                        "description": "تسجيل زيارة جديدة لمريض مع التشخيص والملاحظات.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "patient_id": {
                                    "type": "string",
                                    "description": "معرف المريض (UUID)"
                                },
                                "diagnosis": {
                                    "type": "string",
                                    "description": "التشخيص"
                                },
                                "description": {
                                    "type": "string",
                                    "description": "وصف الحالة"
                                },
                                "notes": {
                                    "type": "string",
                                    "description": "ملاحظات إضافية (اختياري)"
                                },
                                "visit_date": {
                                    "type": "string",
                                    "description": "تاريخ الزيارة (YYYY-MM-DD). إذا لم يُحدد، يستخدم تاريخ اليوم."
                                }
                            },
                            "required": ["patient_id", "diagnosis"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "search_visits_by_diagnosis",
                        "description": "بحث في سجلات الزيارات بناءً على التشخيص أو وصف الحالة (مثلاً: البحث عن كل المرضى اللي عندهم ضغط عالي).",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "كلمة البحث في التشخيص أو الوصف"
                                }
                            },
                            "required": ["query"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "update_patient_info",
                        "description": "تعديل بيانات مريض موجود (مثل تغيير رقم الهاتف أو الاسم). ابحث عن المريض أولاً للحصول على الـ patient_id.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "patient_id": {
                                    "type": "string",
                                    "description": "معرف المريض (UUID)"
                                },
                                "name": {
                                    "type": "string",
                                    "description": "الاسم الجديد (اختياري)"
                                },
                                "phone": {
                                    "type": "string",
                                    "description": "رقم الهاتف الجديد (اختياري)"
                                },
                                "email": {
                                    "type": "string",
                                    "description": "البريد الإلكتروني (اختياري)"
                                },
                                "date_of_birth": {
                                    "type": "string",
                                    "description": "تاريخ الميلاد الجديد YYYY-MM-DD (اختياري)"
                                },
                                "gender": {
                                    "type": "string",
                                    "description": "الجنس: ذكر أو أنثى (اختياري)"
                                }
                            },
                            "required": ["patient_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_patient_full_profile",
                        "description": "عرض الملف الكامل للمريض: بياناته الشخصية + آخر زياراته + مواعيده القادمة.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "patient_id": {
                                    "type": "string",
                                    "description": "معرف المريض (UUID)"
                                }
                            },
                            "required": ["patient_id"]
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_today_schedule",
                        "description": "عرض جدول مواعيد اليوم بالتفصيل مرتبة بالوقت.",
                        "parameters": {
                            "type": "object",
                            "properties": {}
                        }
                    }
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_monthly_report",
                        "description": "تقرير شهري شامل: عدد المرضى الجدد، المواعيد، الإلغاءات، الزيارات المكتملة، ونسبة عدم الحضور.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "month": {
                                    "type": "integer",
                                    "description": "رقم الشهر (1-12). إذا لم يُحدد يستخدم الشهر الحالي."
                                },
                                "year": {
                                    "type": "integer",
                                    "description": "السنة. إذا لم تُحدد تستخدم السنة الحالية."
                                }
                            }
                        }
                    }
                }
            ]

            groq_messages = [{"role": "system", "content": system_instruction}]
            for msg in history:
                role = "assistant" if msg["sender_type"] == "ai" else "user"
                content = msg["content"] or ""
                if msg.get("is_audio") and role == "user":
                    content = f"[ملاحظة صوتية من الطبيب]: {content}"
                groq_messages.append({"role": role, "content": content})

            MAX_ITERATIONS = 8
            for _ in range(MAX_ITERATIONS):
                try:
                    response = await client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=groq_messages,
                        tools=tools,
                        tool_choice="auto",
                        temperature=0.0
                    )
                except Exception as groq_err:
                    err_str = str(groq_err).lower()
                    if "tool" in err_str or "400" in err_str:
                        # Fallback: retry without tools to avoid tool-call validation errors
                        response = await client.chat.completions.create(
                            model="llama-3.3-70b-versatile",
                            messages=groq_messages,
                            temperature=0.0
                        )
                    else:
                        raise groq_err

                response_message = response.choices[0].message
                
                if response_message.tool_calls:
                    groq_messages.append({
                        "role": "assistant",
                        "content": response_message.content or "",
                        "tool_calls": [t.model_dump() for t in response_message.tool_calls]
                    })
                    print("TOOL CALLS BY AI:", [t.function.name for t in response_message.tool_calls])
                    
                    async with db.pool.acquire() as conn:
                        for tool_call in response_message.tool_calls:
                            fn_name = tool_call.function.name
                            print(f"Executing tool: {fn_name} with args: {tool_call.function.arguments}")
                            try:
                                import json
                                fn_args = json.loads(tool_call.function.arguments)
                            except:
                                fn_args = {}
                            if not fn_args:
                                fn_args = {}
                                
                            result_data = {}

                            if fn_name == "search_my_patients":
                                q = fn_args.get("query", "")
                                patients = await conn.fetch(
                                    """
                                    SELECT id, name, phone, date_of_birth
                                    FROM patients
                                    WHERE doctor_id = $1 AND (name ILIKE $2 OR phone ILIKE $2)
                                    LIMIT 5
                                    """,
                                    UUID(owner_id), f"%{q}%"
                                )
                                result_data = {
                                    "patients": [
                                        {"id": str(p['id']), "name": p['name'], "phone": p['phone']}
                                        for p in patients
                                    ]
                                }

                            elif fn_name == "get_patient_visits":
                                pid = fn_args.get("patient_id")
                                if pid:
                                    try:
                                        visits = await conn.fetch(
                                            """
                                            SELECT visit_date, diagnosis, notes, description
                                            FROM patient_visits
                                            WHERE patient_id = $1 AND doctor_id = $2
                                            ORDER BY visit_date DESC LIMIT 5
                                            """,
                                            UUID(str(pid)), UUID(owner_id)
                                        )
                                        result_data = {
                                            "visits": [
                                                {"date": str(v['visit_date']), "description": v['description'], "diagnosis": v['diagnosis']}
                                                for v in visits
                                            ]
                                        }
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"الـ patient_id غير صحيح أو حدث خطأ: {str(e)}. يرجى البحث أولاً باستخدام search_my_patients للحصول على الـ UUID الحقيقي."}
                                else:
                                    result_data = {"status": "error", "message": "الـ patient_id مطلوب للحصول على الزيارات."}

                            elif fn_name == "get_my_appointments":
                                date_from_str = str(fn_args.get("date_from"))
                                date_to_str = str(fn_args.get("date_to"))
                                try:
                                    from datetime import datetime
                                    date_from_obj = datetime.strptime(date_from_str, "%Y-%m-%d").date()
                                    date_to_obj = datetime.strptime(date_to_str, "%Y-%m-%d").date()
                                except ValueError:
                                    from datetime import date, timedelta
                                    date_from_obj = date.today()
                                    date_to_obj = date.today() + timedelta(days=7)

                                appts = await conn.fetch(
                                    """
                                    SELECT a.appointment_date, a.appointment_time, a.status, a.description,
                                           p.name as patient_name
                                    FROM appointments a
                                    JOIN patients p ON p.id = a.patient_id
                                    WHERE a.doctor_id = $1
                                      AND a.appointment_date BETWEEN $2 AND $3
                                    ORDER BY a.appointment_date, a.appointment_time
                                    LIMIT 20
                                    """,
                                    UUID(owner_id), date_from_obj, date_to_obj
                                )
                                result_data = {
                                    "appointments": [
                                        {"date": str(a['appointment_date']), "time": str(a['appointment_time']), "patient": a['patient_name'], "status": a['status']}
                                        for a in appts
                                    ]
                                }

                            elif fn_name == "get_clinic_stats":
                                stats = await conn.fetchrow(
                                    """
                                    SELECT 
                                      (SELECT COUNT(DISTINCT p.id) FROM patients p LEFT JOIN appointments a ON p.id = a.patient_id WHERE p.doctor_id = $1 OR a.doctor_id = $1) as total_patients_all_time,
                                      (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1) as total_appointments_all_time,
                                      (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND date_trunc('month', appointment_date) = date_trunc('month', CURRENT_DATE)) as appointments_this_month,
                                      (SELECT COUNT(*) FROM visits WHERE doctor_id = $1 AND date_trunc('month', visit_date) = date_trunc('month', CURRENT_DATE)) as completed_visits_this_month
                                    """,
                                    UUID(owner_id)
                                )
                                result_data = {
                                    "إجمالي المرضى": stats["total_patients_all_time"],
                                    "إجمالي المواعيد": stats["total_appointments_all_time"],
                                    "مواعيد هذا الشهر": stats["appointments_this_month"],
                                    "الزيارات المكتملة هذا الشهر": stats["completed_visits_this_month"]
                                }

                            elif fn_name == "book_appointment":
                                pid = fn_args.get("patient_id")
                                appt_date = fn_args.get("appointment_date")
                                appt_time = fn_args.get("appointment_time")
                                desc = fn_args.get("description", "")
                                
                                if pid and appt_date and appt_time:
                                    try:
                                        from datetime import datetime
                                        # Parse date and time
                                        d_obj = datetime.strptime(appt_date, "%Y-%m-%d").date()
                                        t_obj = datetime.strptime(appt_time, "%H:%M").time()
                                        
                                        # Insert into appointments table
                                        await conn.execute(
                                            """
                                            INSERT INTO appointments (id, doctor_id, patient_id, appointment_date, appointment_time, description, status, duration_minutes, created_at, updated_at)
                                            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'scheduled', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                            """,
                                            UUID(owner_id), UUID(pid), d_obj, t_obj, desc
                                        )
                                        result_data = {"status": "success", "message": "تم حجز الموعد بنجاح وتحديث قاعدة البيانات."}
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ أثناء الحجز: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "بيانات الحجز غير مكتملة. تأكد من تحديد المريض والتاريخ والوقت."}

                            elif fn_name == "add_new_patient":
                                p_name = fn_args.get("name")
                                p_phone = fn_args.get("phone")
                                p_dob = fn_args.get("date_of_birth")
                                p_gender = fn_args.get("gender")

                                if p_name and p_phone:
                                    try:
                                        from datetime import datetime
                                        d_obj = None
                                        if p_dob:
                                            try:
                                                d_obj = datetime.strptime(p_dob, "%Y-%m-%d").date()
                                            except:
                                                pass
                                        
                                        # Insert into patients table and return the new ID
                                        row = await conn.fetchrow(
                                            """
                                            INSERT INTO patients (id, doctor_id, name, phone, date_of_birth, gender, created_at, updated_at)
                                            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                            RETURNING id
                                            """,
                                            UUID(owner_id), p_name, p_phone, d_obj, p_gender
                                        )
                                        result_data = {
                                            "status": "success", 
                                            "message": f"تمت إضافة المريض {p_name} بنجاح إلى قاعدة البيانات.",
                                            "patient_id": str(row['id'])
                                        }
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ أثناء إضافة المريض: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "اسم المريض ورقم الهاتف مطلوبان."}

                            elif fn_name == "delete_patient":
                                del_pid = fn_args.get("patient_id")
                                if del_pid:
                                    try:
                                        # Delete related appointments first, then delete the patient
                                        await conn.execute(
                                            "DELETE FROM appointments WHERE patient_id = $1 AND doctor_id = $2",
                                            UUID(del_pid), UUID(owner_id)
                                        )
                                        await conn.execute(
                                            "DELETE FROM patient_visits WHERE patient_id = $1 AND doctor_id = $2",
                                            UUID(del_pid), UUID(owner_id)
                                        )
                                        del_result = await conn.execute(
                                            "DELETE FROM patients WHERE id = $1 AND doctor_id = $2",
                                            UUID(del_pid), UUID(owner_id)
                                        )
                                        if "DELETE 1" in del_result:
                                            result_data = {"status": "success", "message": "تم حذف المريض ومواعيده وزياراته بنجاح من قاعدة البيانات."}
                                        else:
                                            result_data = {"status": "error", "message": "لم يتم العثور على المريض أو ليس لديك صلاحية حذفه."}
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ أثناء حذف المريض: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "معرف المريض مطلوب للحذف."}

                            elif fn_name == "cancel_appointment":
                                appt_id = fn_args.get("appointment_id")
                                if appt_id:
                                    try:
                                        res = await conn.execute(
                                            "UPDATE appointments SET status = 'cancelled' WHERE id = $1 AND doctor_id = $2 AND status != 'cancelled'",
                                            UUID(appt_id), UUID(owner_id)
                                        )
                                        if "UPDATE 1" in res:
                                            result_data = {"status": "success", "message": "تم إلغاء الموعد بنجاح."}
                                        else:
                                            result_data = {"status": "error", "message": "لم يتم العثور على الموعد أو أنه ملغي بالفعل."}
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "معرف الموعد مطلوب."}

                            elif fn_name == "reschedule_appointment":
                                appt_id = fn_args.get("appointment_id")
                                new_date_str = fn_args.get("new_date")
                                new_time_str = fn_args.get("new_time")
                                if appt_id and new_date_str and new_time_str:
                                    try:
                                        from datetime import datetime
                                        new_d = datetime.strptime(new_date_str, "%Y-%m-%d").date()
                                        new_t = datetime.strptime(new_time_str, "%H:%M").time()
                                        res = await conn.execute(
                                            "UPDATE appointments SET appointment_date = $1, appointment_time = $2, status = 'scheduled' WHERE id = $3 AND doctor_id = $4",
                                            new_d, new_t, UUID(appt_id), UUID(owner_id)
                                        )
                                        if "UPDATE 1" in res:
                                            result_data = {"status": "success", "message": f"تم تغيير الموعد بنجاح إلى {new_date_str} الساعة {new_time_str}."}
                                        else:
                                            result_data = {"status": "error", "message": "لم يتم العثور على الموعد."}
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "معرف الموعد والتاريخ والوقت الجديد مطلوبون."}

                            elif fn_name == "update_appointment_status":
                                appt_id = fn_args.get("appointment_id")
                                new_status = fn_args.get("new_status")
                                if appt_id and new_status:
                                    try:
                                        res = await conn.execute(
                                            "UPDATE appointments SET status = $1 WHERE id = $2 AND doctor_id = $3",
                                            new_status, UUID(appt_id), UUID(owner_id)
                                        )
                                        status_map = {"confirmed": "مؤكد", "completed": "مكتمل", "no_show": "لم يحضر"}
                                        if "UPDATE 1" in res:
                                            result_data = {"status": "success", "message": f"تم تحديث حالة الموعد إلى: {status_map.get(new_status, new_status)}."}
                                        else:
                                            result_data = {"status": "error", "message": "لم يتم العثور على الموعد."}
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "معرف الموعد والحالة الجديدة مطلوبان."}

                            elif fn_name == "add_visit_record":
                                v_pid = fn_args.get("patient_id")
                                v_diag = fn_args.get("diagnosis")
                                v_desc = fn_args.get("description", "")
                                v_notes = fn_args.get("notes", "")
                                v_date_str = fn_args.get("visit_date")
                                if v_pid and v_diag:
                                    try:
                                        from datetime import datetime, date
                                        v_date = date.today()
                                        if v_date_str:
                                            try:
                                                v_date = datetime.strptime(v_date_str, "%Y-%m-%d").date()
                                            except:
                                                pass
                                        await conn.execute(
                                            """
                                            INSERT INTO visits (id, patient_id, doctor_id, visit_date, description, diagnosis, notes, created_at, updated_at)
                                            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                            """,
                                            UUID(v_pid), UUID(owner_id), v_date, v_desc, v_diag, v_notes
                                        )
                                        result_data = {"status": "success", "message": f"تم تسجيل الزيارة بنجاح بتاريخ {v_date}. التشخيص: {v_diag}"}
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ أثناء تسجيل الزيارة: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "معرف المريض والتشخيص مطلوبان."}

                            elif fn_name == "search_visits_by_diagnosis":
                                sq = fn_args.get("query", "")
                                if sq:
                                    try:
                                        search_results = await conn.fetch(
                                            """
                                            SELECT v.visit_date, v.diagnosis, v.description, v.notes, p.name as patient_name
                                            FROM visits v
                                            JOIN patients p ON p.id = v.patient_id
                                            WHERE v.doctor_id = $1 AND (
                                                v.diagnosis ILIKE $2 OR v.description ILIKE $2 OR v.notes ILIKE $2
                                            )
                                            ORDER BY v.visit_date DESC
                                            LIMIT 10
                                            """,
                                            UUID(owner_id), f"%{sq}%"
                                        )
                                        result_data = {
                                            "results": [
                                                {
                                                    "patient_name": r['patient_name'],
                                                    "visit_date": str(r['visit_date']),
                                                    "diagnosis": r['diagnosis'],
                                                    "description": r['description'],
                                                    "notes": r['notes']
                                                }
                                                for r in search_results
                                            ]
                                        }
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "كلمة البحث مطلوبة."}

                            elif fn_name == "update_patient_info":
                                up_pid = fn_args.get("patient_id")
                                if up_pid:
                                    try:
                                        updates = []
                                        params = [UUID(up_pid), UUID(owner_id)]
                                        param_idx = 3
                                        for field in ["name", "phone", "email", "gender"]:
                                            val = fn_args.get(field)
                                            if val:
                                                updates.append(f"{field} = ${param_idx}")
                                                params.append(val)
                                                param_idx += 1
                                        dob_val = fn_args.get("date_of_birth")
                                        if dob_val:
                                            from datetime import datetime
                                            try:
                                                dob_obj = datetime.strptime(dob_val, "%Y-%m-%d").date()
                                                updates.append(f"date_of_birth = ${param_idx}")
                                                params.append(dob_obj)
                                                param_idx += 1
                                            except:
                                                pass
                                        if updates:
                                            query = f"UPDATE patients SET {', '.join(updates)} WHERE id = $1 AND doctor_id = $2"
                                            res = await conn.execute(query, *params)
                                            if "UPDATE 1" in res:
                                                result_data = {"status": "success", "message": "تم تحديث بيانات المريض بنجاح."}
                                            else:
                                                result_data = {"status": "error", "message": "لم يتم العثور على المريض."}
                                        else:
                                            result_data = {"status": "error", "message": "لم يتم تحديد أي بيانات للتعديل."}
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "معرف المريض مطلوب."}

                            elif fn_name == "get_patient_full_profile":
                                fp_pid = fn_args.get("patient_id")
                                if fp_pid:
                                    try:
                                        patient = await conn.fetchrow(
                                            "SELECT id, name, phone, email, date_of_birth, gender, created_at FROM patients WHERE id = $1 AND doctor_id = $2",
                                            UUID(fp_pid), UUID(owner_id)
                                        )
                                        if patient:
                                            recent_visits = await conn.fetch(
                                                "SELECT visit_date, diagnosis, description, notes FROM visits WHERE patient_id = $1 AND doctor_id = $2 ORDER BY visit_date DESC LIMIT 5",
                                                UUID(fp_pid), UUID(owner_id)
                                            )
                                            upcoming_appts = await conn.fetch(
                                                "SELECT appointment_date, appointment_time, status, description FROM appointments WHERE patient_id = $1 AND doctor_id = $2 AND appointment_date >= CURRENT_DATE AND status != 'cancelled' ORDER BY appointment_date, appointment_time LIMIT 5",
                                                UUID(fp_pid), UUID(owner_id)
                                            )
                                            result_data = {
                                                "patient": {
                                                    "name": patient['name'],
                                                    "phone": patient['phone'],
                                                    "email": patient['email'],
                                                    "date_of_birth": str(patient['date_of_birth']) if patient['date_of_birth'] else None,
                                                    "gender": patient['gender'],
                                                    "registered_at": str(patient['created_at'].date())
                                                },
                                                "recent_visits": [
                                                    {"date": str(v['visit_date']), "diagnosis": v['diagnosis'], "description": v['description']}
                                                    for v in recent_visits
                                                ],
                                                "upcoming_appointments": [
                                                    {"date": str(a['appointment_date']), "time": str(a['appointment_time']), "status": a['status'], "description": a['description']}
                                                    for a in upcoming_appts
                                                ]
                                            }
                                        else:
                                            result_data = {"status": "error", "message": "لم يتم العثور على المريض."}
                                    except Exception as e:
                                        result_data = {"status": "error", "message": f"حدث خطأ: {str(e)}"}
                                else:
                                    result_data = {"status": "error", "message": "معرف المريض مطلوب."}

                            elif fn_name == "get_today_schedule":
                                try:
                                    from datetime import date
                                    today = date.today()
                                    today_appts = await conn.fetch(
                                        """
                                        SELECT a.id, a.appointment_time, a.status, a.description, p.name as patient_name, p.phone as patient_phone
                                        FROM appointments a
                                        JOIN patients p ON p.id = a.patient_id
                                        WHERE a.doctor_id = $1 AND a.appointment_date = $2
                                        ORDER BY a.appointment_time
                                        """,
                                        UUID(owner_id), today
                                    )
                                    result_data = {
                                        "date": str(today),
                                        "total": len(today_appts),
                                        "appointments": [
                                            {
                                                "id": str(a['id']),
                                                "time": str(a['appointment_time']),
                                                "patient_name": a['patient_name'],
                                                "patient_phone": a['patient_phone'],
                                                "status": a['status'],
                                                "description": a['description']
                                            }
                                            for a in today_appts
                                        ]
                                    }
                                except Exception as e:
                                    result_data = {"status": "error", "message": f"حدث خطأ: {str(e)}"}

                            elif fn_name == "get_monthly_report":
                                try:
                                    from datetime import date, datetime
                                    m = fn_args.get("month") or date.today().month
                                    y = fn_args.get("year") or date.today().year
                                    start_date = date(y, m, 1)
                                    if m == 12:
                                        end_date = date(y + 1, 1, 1)
                                    else:
                                        end_date = date(y, m + 1, 1)

                                    new_patients = await conn.fetchval(
                                        "SELECT COUNT(*) FROM patients WHERE doctor_id = $1 AND created_at >= $2 AND created_at < $3",
                                        UUID(owner_id), start_date, end_date
                                    )
                                    total_appts = await conn.fetchval(
                                        "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date >= $2 AND appointment_date < $3",
                                        UUID(owner_id), start_date, end_date
                                    )
                                    completed = await conn.fetchval(
                                        "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date >= $2 AND appointment_date < $3 AND status = 'completed'",
                                        UUID(owner_id), start_date, end_date
                                    )
                                    cancelled = await conn.fetchval(
                                        "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date >= $2 AND appointment_date < $3 AND status = 'cancelled'",
                                        UUID(owner_id), start_date, end_date
                                    )
                                    no_show = await conn.fetchval(
                                        "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date >= $2 AND appointment_date < $3 AND status = 'no_show'",
                                        UUID(owner_id), start_date, end_date
                                    )
                                    total_visits = await conn.fetchval(
                                        "SELECT COUNT(*) FROM visits WHERE doctor_id = $1 AND visit_date >= $2 AND visit_date < $3",
                                        UUID(owner_id), start_date, end_date
                                    )
                                    import calendar
                                    month_name_ar = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]
                                    result_data = {
                                        "month": month_name_ar[m - 1],
                                        "year": y,
                                        "new_patients": new_patients,
                                        "total_appointments": total_appts,
                                        "completed_appointments": completed,
                                        "cancelled_appointments": cancelled,
                                        "no_show": no_show,
                                        "total_visits": total_visits,
                                        "no_show_rate": f"{round((no_show / total_appts * 100) if total_appts > 0 else 0, 1)}%"
                                    }
                                except Exception as e:
                                    result_data = {"status": "error", "message": f"حدث خطأ: {str(e)}"}

                            groq_messages.append({
                                "role": "tool",
                                "name": fn_name,
                                "tool_call_id": tool_call.id,
                                "content": json.dumps(result_data, ensure_ascii=False)
                            })
                else:
                    break
            
            ai_text = response_message.content or ""
            if not ai_text:
                ai_text = "لم أتمكن من إنشاء رد. يرجى المحاولة مرة أخرى."

            ai_message_data = MessageCreate(
                sender_type="ai",
                content=ai_text,
                insight_data=None
            )
            return await ChatService.add_message(thread_id, owner_id, owner_type, ai_message_data)

        except HTTPException:
            raise
        except Exception as e:
            import traceback
            err_msg = traceback.format_exc()
            print("Groq API Error:", err_msg)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Groq API Error: {str(e)}"
            )
