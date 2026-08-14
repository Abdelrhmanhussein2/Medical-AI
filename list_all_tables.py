import asyncio
from app.core.database import db

async def check():
    await db.connect()
    async with db.pool.acquire() as conn:
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        for t in tables:
            t_name = t["table_name"]
            cols = await conn.fetch(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{t_name}'
            """)
            print(f"Table: {t_name}")
            print(f"  Columns: {[c['column_name'] for c in cols]}")
    await db.disconnect()

asyncio.run(check())
