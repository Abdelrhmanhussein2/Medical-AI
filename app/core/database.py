import asyncpg
from app.core.config import settings

class Database:
    def __init__(self):
        self.pool = None

    async def connect(self):
        if not self.pool:
            self.pool = await asyncpg.create_pool(settings.DATABASE_URL)
    
    async def disconnect(self):
        if self.pool:
            await self.pool.close()

db = Database()

async def get_db_connection():
    async with db.pool.acquire() as connection:
        yield connection
