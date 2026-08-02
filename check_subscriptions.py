import asyncio
from app.core.database import db

async def check():
    await db.connect()
    async with db.pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT s.id, s.department_id, s.bundle_id, s.total_seats, s.status, b.name as bundle_name, b.max_doctors
            FROM subscriptions s
            LEFT JOIN subscription_bundles b ON s.bundle_id = b.id
            WHERE s.department_id IS NOT NULL
        """)
        for r in rows:
            print(dict(r))
    await db.disconnect()

asyncio.run(check())
