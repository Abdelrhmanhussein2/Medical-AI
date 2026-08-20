import asyncio
import asyncpg
import os
import sys
import json
from dotenv import load_dotenv

# Add workspace directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.encryption import decrypt_binary, decrypt_bytes

# Load environment variables
load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL", "")

async def export_dataset():
    if not DATABASE_URL:
        print("❌ Error: DATABASE_URL not found in .env file.")
        return

    print("🔌 Connecting to the database...")
    conn = await asyncpg.connect(DATABASE_URL)

    # Create dataset directories
    dataset_dir = os.path.join(os.getcwd(), "dataset_export")
    audio_dir = os.path.join(dataset_dir, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    metadata_file = os.path.join(dataset_dir, "metadata.jsonl")

    session_success = 0
    chat_success = 0

    print(f"📂 Exporting dataset to: {dataset_dir}")
    print("🔓 Starting decryption and extraction process...\n")

    with open(metadata_file, "w", encoding="utf-8") as meta_f:
        
        # ==========================================
        # 1. Export Session Audio Chunks
        # ==========================================
        print("📥 Fetching audio chunks from 'session_audio_chunks'...")
        session_rows = await conn.fetch("""
            SELECT session_id, chunk_index, audio_data, transcript
            FROM session_audio_chunks
            ORDER BY session_id, chunk_index ASC
        """)
        
        if session_rows:
            print(f"  -> Found {len(session_rows)} session chunks. Decrypting...")
            for row in session_rows:
                session_id = str(row["session_id"])
                chunk_index = row["chunk_index"]
                audio_data = row["audio_data"]
                transcript_data = row["transcript"]

                # Decrypt transcript
                decrypted_text = ""
                if transcript_data:
                    try:
                        decrypted_text = decrypt_bytes(transcript_data)
                    except Exception as e:
                        print(f"  ⚠️ Warning: Failed to decrypt session transcript ({session_id} - #{chunk_index}): {e}")
                        continue

                # Decrypt audio
                audio_filename = f"session_{session_id}_{chunk_index}.webm"
                audio_filepath = os.path.join(audio_dir, audio_filename)
                
                if audio_data:
                    try:
                        decrypted_audio = decrypt_binary(audio_data)
                        with open(audio_filepath, "wb") as aud_f:
                            aud_f.write(decrypted_audio)
                    except Exception as e:
                        print(f"  ⚠️ Warning: Failed to decrypt session audio ({session_id} - #{chunk_index}): {e}")
                        continue

                # Write metadata entry
                metadata_entry = {
                    "audio_filepath": f"audio/{audio_filename}",
                    "text": decrypted_text,
                    "session_id": session_id,
                    "chunk_index": chunk_index,
                    "source": "session"
                }
                meta_f.write(json.dumps(metadata_entry, ensure_ascii=False) + "\n")
                session_success += 1
        else:
            print("  -> No session chunks found.")

        # ==========================================
        # 2. Export Chat Audio Messages
        # ==========================================
        print("\n📥 Fetching audio messages from 'chat_messages'...")
        chat_rows = await conn.fetch("""
            SELECT id, thread_id, content, audio_data, created_at
            FROM chat_messages
            WHERE is_audio = TRUE AND audio_data IS NOT NULL
            ORDER BY created_at ASC
        """)
        
        if chat_rows:
            print(f"  -> Found {len(chat_rows)} AI chat audio messages. Decrypting...")
            for row in chat_rows:
                msg_id = str(row["id"])
                thread_id = str(row["thread_id"])
                content_data = row["content"]
                audio_data = row["audio_data"]

                # Decrypt transcript (stored in encrypted 'content' column)
                decrypted_text = ""
                if content_data:
                    try:
                        decrypted_text = decrypt_bytes(content_data)
                    except Exception as e:
                        print(f"  ⚠️ Warning: Failed to decrypt chat text (Msg ID {msg_id}): {e}")
                        continue

                # Decrypt audio
                audio_filename = f"chat_{msg_id}.webm"
                audio_filepath = os.path.join(audio_dir, audio_filename)
                
                if audio_data:
                    try:
                        decrypted_audio = decrypt_binary(audio_data)
                        with open(audio_filepath, "wb") as aud_f:
                            aud_f.write(decrypted_audio)
                    except Exception as e:
                        print(f"  ⚠️ Warning: Failed to decrypt chat audio (Msg ID {msg_id}): {e}")
                        continue

                # Write metadata entry
                metadata_entry = {
                    "audio_filepath": f"audio/{audio_filename}",
                    "text": decrypted_text,
                    "message_id": msg_id,
                    "thread_id": thread_id,
                    "source": "chat"
                }
                meta_f.write(json.dumps(metadata_entry, ensure_ascii=False) + "\n")
                chat_success += 1
        else:
            print("  -> No AI chat audio messages found.")

    print("\n" + "=" * 60)
    print("🎉 Export & Decryption Complete!")
    print(f"🔹 Session chunks exported: {session_success}")
    print(f"🔹 Chat audio messages exported: {chat_success}")
    print(f"🔹 Total records exported: {session_success + chat_success}")
    print(f"📂 Folder: {dataset_dir}")
    print(f"📄 Metadata file: {metadata_file}")
    print("=" * 60)

    await conn.close()

if __name__ == "__main__":
    # Handle Windows console encoding
    if sys.platform.startswith('win'):
        import sys
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        
    asyncio.run(export_dataset())
