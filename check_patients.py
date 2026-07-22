import asyncio
import asyncpg
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())
from app.core.config import settings

DOCTOR_ID = "4f37f129-5154-423a-825b-80e5dfbeaa50"

async def fix():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    # Show patients with NULL doctor_id
    rows = await conn.fetch("SELECT id, name, doctor_id FROM patients WHERE doctor_id IS NULL")
    print(f"Patients with NULL doctor_id: {len(rows)}")
    for r in rows:
        print(f"  id={r['id']} | name='{r['name']}'")

    # Fix: assign to the correct doctor
    result = await conn.execute(
        "UPDATE patients SET doctor_id = $1 WHERE doctor_id IS NULL",
        DOCTOR_ID
    )
    print(f"\nFixed: {result}")
    await conn.close()

asyncio.run(fix())
