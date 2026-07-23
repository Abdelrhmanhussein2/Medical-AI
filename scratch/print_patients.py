import asyncio
import asyncpg
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())
from app.core.config import settings

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    rows = await conn.fetch("SELECT name, phone FROM patients ORDER BY created_at DESC")
    print(f"Total patients: {len(rows)}")
    for r in rows:
        print(f"  {r['name']} | {r['phone']}")
    await conn.close()

asyncio.run(main())
