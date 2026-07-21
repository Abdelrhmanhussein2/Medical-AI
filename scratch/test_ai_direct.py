import asyncio
import os
import sys

# Ensure app path is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.chat_service import ChatService
from app.schemes.chat_schema import MessageCreate
from app.core.database import db
from dotenv import load_dotenv
import codecs

async def main():
    load_dotenv()
    await db.connect()
    
    owner_id = "4f37f129-5154-423a-825b-80e5dfbeaa50"
    owner_type = "doctor"
    thread_id = "4fdea1da-676a-48d7-bfd3-413ebf0affff"
    
    with codecs.open('scratch/out_ai.txt', 'w', 'utf-8') as f:
        # 1. Add user message
        msg_data = MessageCreate(content="ورّيني الملف الكامل لعبدالرحمن", is_audio=False, sender_type="user")
        user_msg = await ChatService.add_message(thread_id, owner_id, owner_type, msg_data)
        f.write(f"User message added: {user_msg.get('content', user_msg)}\n")
        f.flush()
        
        # 2. Generate AI response
        f.write("Generating AI response...\n")
        f.flush()
        ai_msg = await ChatService.generate_ai_response(thread_id, owner_id, owner_type)
        f.write("AI Response:\n")
        f.write(str(ai_msg.get('content', ai_msg)) + "\n")
        if ai_msg.get("actions_data"):
            f.write(f"Actions Data: {ai_msg.get('actions_data')}\n")
        if ai_msg.get("insight_data"):
            f.write(f"Insight Data: {ai_msg.get('insight_data')}\n")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
