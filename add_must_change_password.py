import asyncio
import asyncpg
from app.core.config import settings

async def main():
    print(f"Connecting to database: {settings.DATABASE_URL} ...")
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        
        # Add must_change_password column to doctors table
        res = await conn.execute("""
            ALTER TABLE doctors 
            ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
        """)
        print(f"Executed ALTER TABLE doctors: {res}")
        
        await conn.close()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"Error executing migration: {e}")

if __name__ == "__main__":
    asyncio.run(main())
