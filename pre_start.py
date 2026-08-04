import asyncio
import asyncpg
import subprocess
import sys
import os
from dotenv import load_dotenv

# Load env file if running locally, otherwise it reads from environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def check_and_migrate():
    if not DATABASE_URL:
        print("DATABASE_URL is not set. Skipping database pre-start checks.")
        return

    print("Checking database connection and migration status...")
    
    # Retry logic in case PostgreSQL is still booting up (even with compose healthcheck, it's safe)
    retries = 5
    conn = None
    for attempt in range(retries):
        try:
            conn = await asyncpg.connect(DATABASE_URL)
            print("Successfully connected to the database.")
            break
        except Exception as e:
            print(f"Database connection attempt {attempt + 1}/{retries} failed: {e}")
            if attempt == retries - 1:
                print("Could not connect to the database. Exiting.")
                sys.exit(1)
            await asyncio.sleep(2)

    try:
        # Check if 'alembic_version' table exists
        alembic_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'alembic_version'
            );
        """)
        
        # Check if 'admins' table exists (meaning schema.sql was imported by postgres service init)
        admins_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'admins'
            );
        """)
        
        await conn.close()
        
        if alembic_exists:
            print("Database has been stamped with Alembic. Running pending migrations (alembic upgrade head)...")
            subprocess.run(["alembic", "upgrade", "head"], check=True)
        elif admins_exists:
            print("Database has existing tables (from schema.sql) but is unstamped. Stamping baseline (alembic stamp 8b709742a161)...")
            subprocess.run(["alembic", "stamp", "8b709742a161"], check=True)
            print("Database stamped. Running any new upgrades...")
            subprocess.run(["alembic", "upgrade", "head"], check=True)
        else:
            print("Database is empty. Initializing and running all migrations to head...")
            subprocess.run(["alembic", "upgrade", "head"], check=True)
            
        print("Database migrations and stamping completed successfully.")
    except subprocess.CalledProcessError as err:
        print(f"Error executing Alembic command: {err}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error during pre-start check: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(check_and_migrate())
