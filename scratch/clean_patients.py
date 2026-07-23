import asyncio
import asyncpg
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())
from app.core.config import settings

async def clean_all():
    conn = await asyncpg.connect(settings.DATABASE_URL)

    # Delete in correct order (foreign keys)
    r1 = await conn.execute("DELETE FROM appointments")
    print(f"Deleted appointments: {r1}")

    r2 = await conn.execute("DELETE FROM visits")
    print(f"Deleted visits: {r2}")

    r3 = await conn.execute("DELETE FROM patients")
    print(f"Deleted patients: {r3}")

    # Verify
    count = await conn.fetchval("SELECT COUNT(*) FROM patients")
    print(f"\n✅ المرضى المتبقون: {count}")

    await conn.close()

asyncio.run(clean_all())
