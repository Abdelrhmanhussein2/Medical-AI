import asyncio
import asyncpg
from app.core.config import settings

async def main():
    print(f"Connecting to database: {settings.DATABASE_URL} ...")
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        
        # Query column existence
        query = """
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'doctors' AND column_name = 'must_change_password';
        """
        row = await conn.fetchrow(query)
        
        print("\n=== Database Columns Verification ===")
        if row:
            print(f"Column Name: {row['column_name']}")
            print(f"Data Type: {row['data_type']}")
            print(f"Is Nullable: {row['is_nullable']}")
            print(f"Default Value: {row['column_default']}")
            print("\n✅ Verification Successful: The column 'must_change_password' exists and is correctly configured!")
        else:
            print("\n❌ Verification Failed: The column 'must_change_password' was not found in 'doctors' table.")
            
        await conn.close()
    except Exception as e:
        print(f"\n❌ Connection/Execution Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
