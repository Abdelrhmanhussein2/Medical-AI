import asyncio
from app.core.database import db
from app.core.security import get_password_hash

async def seed_admin():
    await db.connect()
    
    name = "Super Admin"
    email = "admin@medical-ai.com"
    password = "adminpassword123"
    hashed_password = get_password_hash(password)
    
    async with db.pool.acquire() as connection:
        # Check if exists
        existing = await connection.fetchrow("SELECT id FROM admins WHERE email = $1", email)
        if not existing:
            query = """
            INSERT INTO admins (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, name, email
            """
            row = await connection.fetchrow(query, name, email, hashed_password)
            print(f"Admin seeded successfully: {dict(row)}")
        else:
            print("Admin already exists.")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(seed_admin())
