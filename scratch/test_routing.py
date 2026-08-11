import asyncio
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())

# Load .env file manually for the script environment
with open('.env', 'r') as f:
    for line in f:
        if line.strip() and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            os.environ[k] = v

from app.services.router.smart_router import SmartRouter

async def test():
    query = "مين المرضي اللي عندي"
    print(f"Routing query: '{query}'")
    tools = await SmartRouter.get_tools_for_query(current_user_msg=query)
    print("Routed tools:")
    for t in tools:
        print(f" - {t['function']['name']}")

if __name__ == '__main__':
    asyncio.run(test())
