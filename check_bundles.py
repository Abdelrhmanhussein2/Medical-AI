import asyncio
import asyncpg
from app.core.config import settings

async def main():
    print(f"Connecting to database: {settings.DATABASE_URL} ...")
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        rows = await conn.fetch("""
            SELECT id, name, target_type, price, max_doctors 
            FROM subscription_bundles;
        """)
        print("\n=== Subscription Bundles ===")
        for r in rows:
            print(f"ID: {r['id']} | Name: {r['name']} | Target: {r['target_type']} | Price: {r['price']} | Max Doctors: {r['max_doctors']}")
        print("============================\n")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
