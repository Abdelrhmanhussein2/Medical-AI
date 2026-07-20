import asyncio
from app.core.database import db

async def main():
    await db.connect()
    rows = await db.pool.fetch('SELECT id, name FROM patients')
    with open("patients_output.txt", "w", encoding="utf-8") as f:
        for r in rows:
            f.write(f"{r['id']} - {r['name']}\n")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
