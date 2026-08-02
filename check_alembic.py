import asyncio
import asyncpg
from app.core.config import settings

async def main():
    print(f"Connecting to database: {settings.DATABASE_URL} ...")
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        version = await conn.fetchval("SELECT version_num FROM alembic_version LIMIT 1")
        print(f"Current Alembic version in DB: {version}")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
