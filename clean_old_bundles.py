import asyncio
from app.core.database import db

async def clean_old_bundles():
    """
    Cleans up old subscription bundles from the database (e.g. Basic Practitioner, Premium Clinical, etc.)
    along with any associated subscriptions and doctor seat assignments to prevent foreign key errors,
    keeping only 'Free Trial' and the new SBR AI bundles.
    """
    # Active bundles to keep (specified by name and target_type)
    bundles_to_keep = [
        ("Free Trial", "doctor"),
        ("SBR AI Starter", "doctor"),
        ("SBR AI Pro", "doctor"),
        ("SBR AI Business", "department"),
        ("SBR AI Enterprise", "department")
    ]

    print("Connecting to the database...")
    await db.connect()

    async with db.pool.acquire() as conn:
        # 1. Fetch all bundles
        all_db_bundles = await conn.fetch("SELECT id, name, target_type, price FROM subscription_bundles")
        
        # Filter old bundles in Python
        old_bundles = []
        for dbb in all_db_bundles:
            keep = False
            for k_name, k_type in bundles_to_keep:
                if dbb["name"] == k_name and dbb["target_type"] == k_type:
                    keep = True
                    break
            if not keep:
                old_bundles.append(dbb)

        if not old_bundles:
            print("No old bundles found to clean up! Your database is already clean.")
            await db.disconnect()
            return

        print(f"Found {len(old_bundles)} old bundle(s) to remove:")
        for ob in old_bundles:
            print(f"  - '{ob['name']}' ({ob['target_type']}) - {ob['price']} SAR [ID: {ob['id']}]")

        old_bundle_ids = [ob["id"] for ob in old_bundles]

        # 2. Delete seat assignments from subscription_doctors referencing subscriptions to be deleted
        print("\nCleaning up associated subscription seats (subscription_doctors)...")
        deleted_seats = await conn.execute(
            """
            DELETE FROM subscription_doctors 
            WHERE subscription_id IN (
                SELECT id FROM subscriptions WHERE bundle_id = ANY($1::uuid[])
            )
            """,
            old_bundle_ids
        )
        print(f"Result: {deleted_seats}")

        # 3. Delete subscriptions referencing the old bundles
        print("Cleaning up associated subscriptions...")
        deleted_subs = await conn.execute(
            "DELETE FROM subscriptions WHERE bundle_id = ANY($1::uuid[])",
            old_bundle_ids
        )
        print(f"Result: {deleted_subs}")

        # 4. Delete the old bundles
        print("Deleting old bundles from subscription_bundles...")
        deleted_bundles = await conn.execute(
            "DELETE FROM subscription_bundles WHERE id = ANY($1::uuid[])",
            old_bundle_ids
        )
        print(f"Result: {deleted_bundles}")

    await db.disconnect()
    print("\nCleanup completed successfully! You can now safely run the seed script.")

if __name__ == "__main__":
    asyncio.run(clean_old_bundles())
