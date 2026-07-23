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
    
    print("\n==================================================")
    print("🧪 STARTING MULTI-TURN REGISTRATION TEST")
    print("==================================================")
    
    # 1. Create thread
    thread_data = ThreadCreate(title="Multi-turn Test", dept="General")
    thread = await ChatService.create_thread(owner_id, owner_type, thread_data)
    thread_id = str(thread['id'])
    
    # Turn 1
    print("\n--- TURN 1: User asks to register ---")
    msg1 = MessageCreate(content="سجل مريض جديد باسم علاء حسني", is_audio=False, sender_type="user")
    await ChatService.add_message(thread_id, owner_id, owner_type, msg1)
    res1 = await ChatService.generate_ai_response(thread_id, owner_id, owner_type)
    print(f"AI Response 1: {res1['content']}")
    
    # Turn 2
    print("\n--- TURN 2: User says 'ماشي سجله' ---")
    msg2 = MessageCreate(content="ماشي سجله", is_audio=False, sender_type="user")
    await ChatService.add_message(thread_id, owner_id, owner_type, msg2)
    res2 = await ChatService.generate_ai_response(thread_id, owner_id, owner_type)
    print(f"AI Response 2: {res2['content']}")
    
    # Turn 3
    print("\n--- TURN 3: User provides phone number ---")
    msg3 = MessageCreate(content="رقم تليفونه هو 01012345678", is_audio=False, sender_type="user")
    await ChatService.add_message(thread_id, owner_id, owner_type, msg3)
    res3 = await ChatService.generate_ai_response(thread_id, owner_id, owner_type)
    print(f"AI Response 3: {res3['content']}")
    
    # Verify DB
    conn = await db.pool.acquire()
    try:
        row = await conn.fetchrow("SELECT name, phone FROM patients WHERE name = 'علاء حسني'")
        if row:
            print(f"\n🎉 SUCCESS! Patient registered in DB: name='{row['name']}' | phone='{row['phone']}'")
        else:
            print("\n❌ FAILED: Patient was not found in DB at the end of the flow!")
    finally:
        await db.pool.release(conn)
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
