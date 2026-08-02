import asyncio
import asyncpg
from app.core.config import settings

async def main():
    print(f"Connecting to database: {settings.DATABASE_URL} ...")
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        
        # 1. Update SBR AI Business target type and max_doctors
        res_business = await conn.execute("""
            UPDATE subscription_bundles 
            SET target_type = 'department', max_doctors = 4, allowed_minutes = 3500, is_active = true, updated_at = now() 
            WHERE name = 'SBR AI Business';
        """)
        print(f"Updated SBR AI Business: {res_business}")

        # 2. Update SBR AI Enterprise target type and max_doctors
        res_enterprise = await conn.execute("""
            UPDATE subscription_bundles 
            SET target_type = 'department', max_doctors = 7, allowed_minutes = 5000, is_active = true, updated_at = now() 
            WHERE name = 'SBR AI Enterprise';
        """)
        print(f"Updated SBR AI Enterprise: {res_enterprise}")

        # 3. Ensure other new plans are active and set to 'doctor'
        res_new_doctor = await conn.execute("""
            UPDATE subscription_bundles 
            SET target_type = 'doctor', max_doctors = NULL, is_active = true, updated_at = now() 
            WHERE name IN ('Free Trial', 'SBR AI Starter', 'SBR AI Pro');
        """)
        print(f"Ensured SBR AI Starter, SBR AI Pro, and Free Trial are active: {res_new_doctor}")

        # 4. DELETE all subscriptions referencing the old bundles first (to avoid foreign key constraint violations)
        res_delete_subs = await conn.execute("""
            DELETE FROM subscriptions 
            WHERE bundle_id IN (
                SELECT id FROM subscription_bundles 
                WHERE name NOT IN ('Free Trial', 'SBR AI Starter', 'SBR AI Pro', 'SBR AI Business', 'SBR AI Enterprise')
            );
        """)
        print(f"Deleted old subscriptions referencing old bundles: {res_delete_subs}")

        # 5. DELETE the old bundles themselves from subscription_bundles
        res_delete_bundles = await conn.execute("""
            DELETE FROM subscription_bundles 
            WHERE name NOT IN ('Free Trial', 'SBR AI Starter', 'SBR AI Pro', 'SBR AI Business', 'SBR AI Enterprise');
        """)
        print(f"Deleted old bundles from database: {res_delete_bundles}")

        print("\n=== Verification of Current Bundles in Database ===")
        rows = await conn.fetch("""
            SELECT id, name, target_type, price, max_doctors, is_active 
            FROM subscription_bundles
            ORDER BY price ASC;
        """)
        for r in rows:
            print(f"- {r['name']} | Target: {r['target_type']} | Price: {r['price']} | Max Docs: {r['max_doctors']} | Active: {r['is_active']}")
        
        await conn.close()
        print("\nAll old bundles and their subscriptions have been completely deleted!")
    except Exception as e:
        print(f"Error executing delete: {e}")

if __name__ == "__main__":
    asyncio.run(main())
