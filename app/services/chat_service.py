from app.core.database import db
from app.core.encryption import encrypt_text, decrypt_bytes
from app.schemes.chat_schema import ThreadCreate, ThreadUpdate, MessageCreate
from fastapi import HTTPException, status
from uuid import UUID
from datetime import datetime
from typing import List, Optional
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
