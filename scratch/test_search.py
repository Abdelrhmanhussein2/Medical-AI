import asyncio
import asyncpg
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

async def main():
    conn = await asyncpg.connect(user="medical_user", password="medical_password", database="medical_ai", host="localhost", port=5432)
    q = "عبدالرحمن"
    patients = await conn.fetch(
        """
        SELECT id, name, phone, doctor_id
        FROM patients
        WHERE name ILIKE $1 OR phone ILIKE $1
        LIMIT 5
        """,
        f"%{q}%"
    )
    print("Search results:")
    for p in patients:
        print(f"{p['id']} - {p['name']} - {p['phone']} - doc: {p['doctor_id']}")
    
    print("\nAll patients:")
    all_p = await conn.fetch("SELECT name, phone FROM patients")
    for p in all_p:
        print(f"{p['name']} - {p['phone']}")

asyncio.run(main())
