import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.config import settings
from app.core.encryption import decrypt_bytes
from uuid import UUID
import asyncpg

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        threads = await conn.fetch("SELECT id, title, created_at FROM chat_threads ORDER BY created_at DESC LIMIT 10")
        print(f"Total threads: {len(threads)}")
        for t in threads:
            print(f"Thread: {t['title']} | ID: {t['id']} | Created: {t['created_at']}")
            # Count messages
            cnt = await conn.fetchval("SELECT count(*) FROM chat_messages WHERE thread_id = $1", t['id'])
            print(f"  Messages count: {cnt}")
            if cnt > 0:
                rows = await conn.fetch(
                    "SELECT sender_type, content FROM chat_messages WHERE thread_id = $1 ORDER BY created_at ASC",
                    t['id']
                )
                for r in rows:
                    content_decrypted = decrypt_bytes(r['content'])
                    if isinstance(content_decrypted, bytes):
                        content_decrypted = content_decrypted.decode('utf-8')
                    print(f"    [{r['sender_type'].upper()}]: {content_decrypted[:100]}...")
            print("-" * 50)
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
