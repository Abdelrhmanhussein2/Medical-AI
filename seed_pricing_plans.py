"""
seed_pricing_plans.py
=====================
Seed the subscription_plans table with the four internal pricing plans.

Usage:
    python seed_pricing_plans.py

Safe to re-run — uses ON CONFLICT DO UPDATE (upsert on plan_code).
Does NOT touch any other table.
"""

import asyncio
from app.core.database import db


PLANS = [
    # ------------------------------------------------------------------
    # Doctor plans
    # ------------------------------------------------------------------
    {
        "plan_code":              "doctor_basic",
        "target_type":            "doctor",
        "price_usd":              11.00,
        "voice_minutes_included": 1285,
        "message_budget_usd":     2.00,
        "doctors_included":       None,
        "price_per_extra_doctor": None,
    },
    {
        "plan_code":              "doctor_pro",
        "target_type":            "doctor",
        "price_usd":              22.00,
        "voice_minutes_included": 2570,
        "message_budget_usd":     4.00,
        "doctors_included":       None,
        "price_per_extra_doctor": None,
    },
    # ------------------------------------------------------------------
    # Organization plans
    # ------------------------------------------------------------------
    {
        "plan_code":              "org_4_doctors",
        "target_type":            "organization",
        "price_usd":              44.00,
        "voice_minutes_included": 5140,
        "message_budget_usd":     8.00,
        "doctors_included":       4,
        "price_per_extra_doctor": 4.00,
    },
    {
        "plan_code":              "org_7_doctors",
        "target_type":            "organization",
        "price_usd":              77.00,
        "voice_minutes_included": 9000,
        "message_budget_usd":     14.00,
        "doctors_included":       7,
        "price_per_extra_doctor": 4.00,
    },
]


async def seed() -> None:
    await db.connect()

    async with db.pool.acquire() as conn:
        for plan in PLANS:
            row = await conn.fetchrow(
                """
                INSERT INTO subscription_plans
                    (plan_code, target_type, price_usd,
                     voice_minutes_included, message_budget_usd,
                     doctors_included, price_per_extra_doctor)
                VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (plan_code) DO UPDATE SET
                    target_type             = EXCLUDED.target_type,
                    price_usd               = EXCLUDED.price_usd,
                    voice_minutes_included  = EXCLUDED.voice_minutes_included,
                    message_budget_usd      = EXCLUDED.message_budget_usd,
                    doctors_included        = EXCLUDED.doctors_included,
                    price_per_extra_doctor  = EXCLUDED.price_per_extra_doctor,
                    updated_at              = now()
                RETURNING id, plan_code, target_type, price_usd,
                          voice_minutes_included, message_budget_usd
                """,
                plan["plan_code"],
                plan["target_type"],
                plan["price_usd"],
                plan["voice_minutes_included"],
                plan["message_budget_usd"],
                plan["doctors_included"],
                plan["price_per_extra_doctor"],
            )
            print(
                f"  [OK] {row['plan_code']:<20}  "
                f"${row['price_usd']:>6.2f} USD  |  "
                f"{row['voice_minutes_included']:>5} min  |  "
                f"${row['message_budget_usd']:>5.2f} msg budget"
            )

        # Quick sanity check — show the view
        print("\n--- plans_with_message_limits -----------------------------------")
        rows = await conn.fetch(
            """
            SELECT plan_code, price_usd, voice_minutes_included,
                   message_budget_usd, messages_included
            FROM   plans_with_message_limits
            ORDER  BY id
            """
        )
        for r in rows:
            print(
                f"  {r['plan_code']:<20}  "
                f"${r['price_usd']:>6.2f}  |  "
                f"{r['voice_minutes_included']:>5} voice-min  |  "
                f"~{r['messages_included']:>5} AI messages"
            )
        print("-----------------------------------------------------------------\n")

    await db.disconnect()
    print("SUCCESS: Pricing plans seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
