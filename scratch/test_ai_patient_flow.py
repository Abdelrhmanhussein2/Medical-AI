import asyncio
import os
import sys
import uuid
import logging

sys.stdout.reconfigure(encoding='utf-8')

# Set up logging to stdout
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

sys.path.insert(0, os.getcwd())

from app.services.chat_service import ChatService
from app.schemes.chat_schema import ThreadCreate, MessageCreate
from app.core.database import db
from dotenv import load_dotenv

async def main():
    load_dotenv()
    await db.connect()
    
    owner_id = "4f37f129-5154-423a-825b-80e5dfbeaa50"
    owner_type = "doctor"
    
    print("\n--- 1. Creating fresh thread in database ---")
    thread_data = ThreadCreate(title="Test Patient Registration Flow", dept="General")
    thread = await ChatService.create_thread(owner_id, owner_type, thread_data)
    thread_id = str(thread['id'])
    print(f"Created thread: {thread_id}")
    
    print("\n--- 2. Sending simultaneous register & book query ---")
    msg_data = MessageCreate(content="سجل مريض جديد باسم علاء حسني واحجز له موعد يوم السبت الساعة 10", is_audio=False, sender_type="user")
    user_msg = await ChatService.add_message(thread_id, owner_id, owner_type, msg_data)
    print(f"User: {msg_data.content}")
    
    print("\n--- 3. Generating AI response ---")
    ai_msg = await ChatService.generate_ai_response(thread_id, owner_id, owner_type)
    print(f"AI Response content: {ai_msg['content']}")
    
    # Check if a patient was added to the DB
    conn = await db.pool.acquire()
    try:
        exists = await conn.fetchrow("SELECT name, phone FROM patients WHERE name = 'علاء حسني'")
        if exists:
            print(f"\n❌ ERROR: Patient 'علاء حسني' was REGISTERED with phone='{exists['phone']}' without asking!")
        else:
            print("\n✅ SUCCESS: Patient was NOT registered immediately.")
    finally:
        await db.pool.release(conn)
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
