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
        },
        {
            "name": "SBR AI Starter",
            "name_ar": "SBR AI Starter",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 149.00,
        },
        {
            "name": "SBR AI Pro",
            "name_ar": "SBR AI Pro",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 249.00,
        },
        {
            "name": "SBR AI Business",
            "name_ar": "SBR AI Business",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 449.00,
        },
        {
            "name": "SBR AI Enterprise",
            "name_ar": "SBR AI Enterprise",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 599.00,
        },
    ]

    # Department / Organization bundles
    department_bundles = [
        {
            "name": "Silver Clinic Bundle",
            "name_ar": "باقة العيادة الفضية",
            "target_type": "department",
            "max_doctors": 10,
            "duration_days": 30,
            "price": 199.00,
        },
        {
            "name": "Gold Health Center",
            "name_ar": "المركز الصحي الذهبي",
            "target_type": "department",
            "max_doctors": 15,
            "duration_days": 30,
            "price": 299.00,
        },
        {
            "name": "Platinum Hospital",
            "name_ar": "المستشفى البلاتيني",
            "target_type": "department",
            "max_doctors": 20,
            "duration_days": 30,
            "price": 399.00,
        },
    ]

    all_bundles = doctor_bundles + department_bundles

    async with db.pool.acquire() as connection:
        # Add name_ar column if it does not exist yet (safe migration)
        await connection.execute("""
            ALTER TABLE subscription_bundles
            ADD COLUMN IF NOT EXISTS name_ar VARCHAR(150);
        """)

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
                        (name, name_ar, target_type, max_doctors, duration_days, price)
                    VALUES ($1, $2, $3::bundle_target, $4, $5, $6)
                    RETURNING id, name, name_ar, target_type, price
                    """,
                    b["name"],
                    b["name_ar"],
                    b["target_type"],
                    b["max_doctors"],
                    b["duration_days"],
                    b["price"],
                )
                print(f"✅ Bundle seeded: {dict(row)}")
            else:
                # Update name_ar in case it was NULL from previous seed
                await connection.execute(
                    "UPDATE subscription_bundles SET name_ar = $1 WHERE name = $2 AND target_type = $3::bundle_target",
                    b["name_ar"], b["name"], b["target_type"]
                )
                print(f"⏭️  Bundle already exists (updated name_ar): '{b['name']}'")

    await db.disconnect()
    print("\n✅ Bundles seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_bundles())
