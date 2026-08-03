import asyncio
from app.core.database import db

async def seed_bundles():
    """
    Seeds the subscription_bundles table with SBR AI plans that match the frontend plans.js.
    Run this script once (or re-run safely — it uses upsert logic).

    Plans (Doctor):
      - Free Trial        – 0 SAR / 60 min
      - SBR AI Starter    – 149 SAR / 1000 min
      - SBR AI Pro        – 249 SAR / 2000 min
      - SBR AI Business   – 449 SAR / 3500 min
      - SBR AI Enterprise – 599 SAR / 5000 min

    Plans (Department / Org):
      - Silver Clinic Bundle  – 199 SAR / 10 doctors
      - Gold Health Center    – 299 SAR / 15 doctors
      - Platinum Hospital     – 399 SAR / 20 doctors
    """
    await db.connect()

    # Doctor bundles — aligned with frontend plans.js
    doctor_bundles = [
        {
            "name": "Free Trial",
            "name_ar": "تجربة مجانية",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 0.00,
            "allowed_minutes": 60,
            "allowed_messages": 100,
        },
        {
            "name": "SBR AI Starter",
            "name_ar": "SBR AI Starter",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 149.00,
            "allowed_minutes": 1285,
            "allowed_messages": 1169,
        },
        {
            "name": "SBR AI Pro",
            "name_ar": "SBR AI Pro",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 279.00,
            "allowed_minutes": 2570,
            "allowed_messages": 2339,
        },
    ]

    # Department / Organization bundles
    department_bundles = [
        {
            "name": "SBR AI Business",
            "name_ar": "SBR AI Business",
            "target_type": "department",
            "max_doctors": 4,
            "duration_days": 30,
            "price": 549.00,
            "allowed_minutes": 5140,
            "allowed_messages": 4678,
        },
        {
            "name": "SBR AI Enterprise",
            "name_ar": "SBR AI Enterprise",
            "target_type": "department",
            "max_doctors": 7,
            "duration_days": 30,
            "price": 799.00,
            "allowed_minutes": 9000,
            "allowed_messages": 8187,
        },
    ]

    all_bundles = doctor_bundles + department_bundles

    async with db.pool.acquire() as connection:
        # Add name_ar column if it does not exist yet (safe migration)
        await connection.execute("""
            ALTER TABLE subscription_bundles
            ADD COLUMN IF NOT EXISTS name_ar VARCHAR(150);
        """)

        # Clean up old active bundles that are no longer in our list (matching name and target_type)
        existing_bundles = await connection.fetch("SELECT id, name, target_type FROM subscription_bundles")
        for eb in existing_bundles:
            match_found = False
            for b in all_bundles:
                if b["name"] == eb["name"] and b["target_type"] == eb["target_type"]:
                    match_found = True
                    break
            if not match_found:
                print(f"CLEANUP: Deleting obsolete bundle '{eb['name']}' ({eb['target_type']})")
                # Cascade deletions manually to prevent FK constraint failures
                await connection.execute(
                    "DELETE FROM subscription_doctors WHERE subscription_id IN (SELECT id FROM subscriptions WHERE bundle_id = $1)",
                    eb["id"]
                )
                await connection.execute(
                    "DELETE FROM subscriptions WHERE bundle_id = $1",
                    eb["id"]
                )
                await connection.execute(
                    "DELETE FROM subscription_bundles WHERE id = $1",
                    eb["id"]
                )

        for b in all_bundles:
            # Check if bundle already exists by name + target_type
            existing = await connection.fetchrow(
                "SELECT id FROM subscription_bundles WHERE name = $1 AND target_type = $2::bundle_target",
                b["name"], b["target_type"]
            )
            if not existing:
                row = await connection.fetchrow(
                    """
                    INSERT INTO subscription_bundles
                        (name, name_ar, target_type, max_doctors, duration_days, price, allowed_minutes, allowed_messages)
                    VALUES ($1, $2, $3::bundle_target, $4, $5, $6, $7, $8)
                    RETURNING id, name, name_ar, target_type, price, allowed_minutes, allowed_messages
                    """,
                    b["name"],
                    b["name_ar"],
                    b["target_type"],
                    b["max_doctors"],
                    b["duration_days"],
                    b["price"],
                    b["allowed_minutes"],
                    b["allowed_messages"],
                )
                print(f"SUCCESS: Bundle seeded: {dict(row)}")
            else:
                # Update name_ar in case it was NULL from previous seed, and update details
                await connection.execute(
                    """
                    UPDATE subscription_bundles 
                    SET name_ar = $1, max_doctors = $2, duration_days = $3, price = $4, allowed_minutes = $5, allowed_messages = $6
                    WHERE name = $7 AND target_type = $8::bundle_target
                    """,
                    b["name_ar"], b["max_doctors"], b["duration_days"], b["price"], b["allowed_minutes"], b["allowed_messages"], b["name"], b["target_type"]
                )
                print(f"SUCCESS: Updated existing bundle: '{b['name']}' ({b['target_type']})")

    await db.disconnect()
    print("\nSUCCESS: Bundles seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_bundles())
