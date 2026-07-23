import asyncio
from app.core.config import settings
from app.core.encryption import decrypt_bytes
from uuid import UUID
import asyncpg

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        thread_id = "74f803fd-66f1-4bba-a51f-6ffabccc4c59"
        rows = await conn.fetch(
            "SELECT * FROM chat_messages WHERE thread_id = $1 ORDER BY created_at ASC",
            UUID(thread_id)
        )
        print("MESSAGES IN THREAD:")
        for r in rows:
            content_decrypted = decrypt_bytes(r['content'])
            # Decode if bytes
            if isinstance(content_decrypted, bytes):
                content_decrypted = content_decrypted.decode('utf-8')
            print(f"[{r['sender_type'].upper()}] (ID: {r['id']})")
            print(content_decrypted)
            print("-" * 50)
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
