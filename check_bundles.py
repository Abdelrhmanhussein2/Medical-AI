import asyncio
from app.core.database import db

async def check():
    await db.connect()
    async with db.pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, name, target_type, is_active FROM subscription_bundles")
        for r in rows:
            print(dict(r))
    await db.disconnect()

asyncio.run(check())
