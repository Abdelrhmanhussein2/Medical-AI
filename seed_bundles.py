import asyncio
from app.core.database import db

async def seed_bundles():
    await db.connect()
    
    bundles = [
        # Doctor bundles
        {
            "name": "Basic Practitioner",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 29.99
        },
        {
            "name": "Pro AI Suite",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 59.99
        },
        {
            "name": "Premium Clinical",
            "target_type": "doctor",
            "max_doctors": None,
            "duration_days": 30,
            "price": 99.99
        },
        # Department bundles
        {
            "name": "Silver Clinic Bundle",
            "target_type": "department",
            "max_doctors": 10,
            "duration_days": 30,
            "price": 199.99
        },
        {
            "name": "Gold Health Center",
            "target_type": "department",
            "max_doctors": 15,
            "duration_days": 30,
            "price": 299.99
        },
        {
            "name": "Platinum Hospital",
            "target_type": "department",
            "max_doctors": 20,
            "duration_days": 30,
            "price": 399.99
        }
    ]
    
    async with db.pool.acquire() as connection:
        for b in bundles:
            # Check if bundle already exists by name
            existing = await connection.fetchrow(
                "SELECT id FROM subscription_bundles WHERE name = $1 AND target_type = $2", 
                b["name"], b["target_type"]
            )
            if not existing:
                query = """
                INSERT INTO subscription_bundles (name, target_type, max_doctors, duration_days, price)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, name, target_type
                """
                row = await connection.fetchrow(
                    query, 
                    b["name"], 
                    b["target_type"], 
                    b["max_doctors"], 
                    b["duration_days"], 
                    b["price"]
                )
                print(f"Bundle seeded successfully: {dict(row)}")
            else:
                print(f"Bundle '{b['name']}' already exists.")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(seed_bundles())
