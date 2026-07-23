import asyncio
import os
import sys
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
    print("🧪 STARTING SIMULTANEOUS REGISTER & BOOK TEST")
    print("==================================================")
    
    # 1. Create thread
    thread_data = ThreadCreate(title="Simultaneous Test", dept="General")
    thread = await ChatService.create_thread(owner_id, owner_type, thread_data)
    thread_id = str(thread['id'])
    
    # Turn 1: Register & Book without phone
    print("\n--- TURN 1: User request (no phone) ---")
    msg1 = MessageCreate(content="سجل مريض جديد باسم علاء حسني واحجز له موعد يوم السبت الساعة 10", is_audio=False, sender_type="user")
    await ChatService.add_message(thread_id, owner_id, owner_type, msg1)
    res1 = await ChatService.generate_ai_response(thread_id, owner_id, owner_type)
    print(f"AI Response 1: {res1['content']}")
    
    # Turn 2: User provides phone number
    print("\n--- TURN 2: User provides phone number ---")
    msg2 = MessageCreate(content="رقم تليفونه هو 01012345678", is_audio=False, sender_type="user")
    await ChatService.add_message(thread_id, owner_id, owner_type, msg2)
    res2 = await ChatService.generate_ai_response(thread_id, owner_id, owner_type)
    print(f"AI Response 2: {res2['content']}")
    
    # Verify DB
    conn = await db.pool.acquire()
    try:
        p_row = await conn.fetchrow("SELECT id, name, phone FROM patients WHERE name = 'علاء حسني'")
        if p_row:
            print(f"\n🎉 SUCCESS: Patient registered: name='{p_row['name']}' | phone='{p_row['phone']}'")
            # Check if appointment exists
            a_row = await conn.fetchrow("SELECT appointment_date, appointment_time FROM appointments WHERE patient_id = $1", p_row['id'])
            if a_row:
                print(f"🎉 SUCCESS: Appointment booked: date='{a_row['appointment_date']}' | time='{a_row['appointment_time']}'")
            else:
                print("❌ FAILED: Appointment was NOT booked!")
        else:
            print("❌ FAILED: Patient was NOT found in DB!")
    finally:
        await db.pool.release(conn)
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
