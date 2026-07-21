import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(user="medical_user", password="medical_password", database="medical_ai", host="localhost", port=5432)
    threads = await conn.fetch("SELECT id, owner_type, owner_id FROM chat_threads ORDER BY updated_at DESC LIMIT 1")
    if threads:
        print(f"Last thread: {threads[0]['id']}, Owner Type: {threads[0]['owner_type']}, Owner ID: {threads[0]['owner_id']}")
    else:
        print("No threads found")

asyncio.run(main())
