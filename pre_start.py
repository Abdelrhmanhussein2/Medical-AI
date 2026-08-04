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
        # Check if 'alembic_version' table exists and fetch current version
        alembic_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'alembic_version'
            );
        """)
        
        current_version = None
        if alembic_exists:
            current_version = await conn.fetchval("SELECT version_num FROM alembic_version LIMIT 1")
        
        # Check if 'admins' table exists (meaning schema.sql was imported by postgres service init)
        admins_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'admins'
            );
        """)
        
        # Direct SQL stamping/updating to bypass Alembic revision validation checks on deleted history
        if alembic_exists and current_version != 'a00000000001':
            print(f"Old Alembic version {current_version} found. Direct SQL force-updating alembic_version to a00000000001...")
            await conn.execute("DELETE FROM alembic_version;")
            await conn.execute("INSERT INTO alembic_version (version_num) VALUES ('a00000000001');")
            current_version = 'a00000000001'
        elif admins_exists and not alembic_exists:
            print("Database has existing tables but no stamp. Direct SQL creating alembic_version and stamping a00000000001...")
            await conn.execute("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) PRIMARY KEY);")
            await conn.execute("DELETE FROM alembic_version;")
            await conn.execute("INSERT INTO alembic_version (version_num) VALUES ('a00000000001');")
            alembic_exists = True
            current_version = 'a00000000001'
            
        await conn.close()
        
        # Ensure all columns/tables are synchronized
        print("Ensuring database schema is fully synchronized...")
        subprocess.run([sys.executable, "-m", "app.sync_db_schema"], check=True)
        
        # Now we only run alembic upgrade head to apply any future migrations
        if alembic_exists:
            print("Database is at the baseline a00000000001. Running pending migrations (alembic upgrade head)...")
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
