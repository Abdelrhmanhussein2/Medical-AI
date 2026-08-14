import asyncio
from app.core.database import db

async def check():
    await db.connect()
    async with db.pool.acquire() as conn:
        print("--- Subscriptions ---")
        subs = await conn.fetch("""
            SELECT s.id, s.department_id, s.doctor_id, s.total_seats, s.status, b.name as bundle_name
            FROM subscriptions s
            LEFT JOIN subscription_bundles b ON s.bundle_id = b.id
        """)
        for s in subs:
            print(dict(s))
            
        print("\n--- Assigned Seats (subscription_doctors) ---")
        seats = await conn.fetch("""
            SELECT sd.subscription_id, sd.doctor_id, d.name as doctor_name, d.email
            FROM subscription_doctors sd
            JOIN doctors d ON sd.doctor_id = d.id
        """)
        for st in seats:
            print(f"Sub: {st['subscription_id']}, Doc: {st['doctor_id']}, Name: {ascii(st['doctor_name'])}, Email: {st['email']}")
            
    await db.disconnect()

asyncio.run(check())
