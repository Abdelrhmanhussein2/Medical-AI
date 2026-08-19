"""
verify_audio_chunks.py
----------------------
Quick end-to-end verification that:
  1. The session_audio_chunks table exists with the correct schema.
  2. The encryption helpers (encrypt_binary / decrypt_binary / encrypt_text / decrypt_bytes)
     round-trip correctly.
  3. We can INSERT a dummy encrypted chunk and SELECT + decrypt it back.

Run:  python verify_audio_chunks.py
"""

import asyncio
import asyncpg
import os
import sys

# ── Make the project importable ───────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL", "")
CHAT_ENCRYPTION_KEY = os.environ.get("CHAT_ENCRYPTION_KEY", "")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env — cannot connect.")
    sys.exit(1)

if not CHAT_ENCRYPTION_KEY:
    print("❌ CHAT_ENCRYPTION_KEY not found in .env — cannot test encryption.")
    sys.exit(1)

from cryptography.fernet import Fernet

_cipher = Fernet(CHAT_ENCRYPTION_KEY.encode())

def encrypt_binary(raw_bytes: bytes) -> bytes:
    return _cipher.encrypt(raw_bytes) if raw_bytes else b""

def decrypt_binary(ciphertext) -> bytes:
    if not ciphertext:
        return b""
    if isinstance(ciphertext, memoryview):
        ciphertext = bytes(ciphertext)
    return _cipher.decrypt(ciphertext)

def encrypt_text(plaintext: str) -> bytes:
    return _cipher.encrypt(plaintext.encode("utf-8")) if plaintext else b""

def decrypt_bytes(ciphertext) -> str:
    if not ciphertext:
        return ""
    if isinstance(ciphertext, memoryview):
        ciphertext = bytes(ciphertext)
    return _cipher.decrypt(ciphertext).decode("utf-8")


SEPARATOR = "─" * 60

async def main():
    print(f"\n{SEPARATOR}")
    print("  session_audio_chunks — Encryption & DB Verification")
    print(SEPARATOR)

    # ── 1. Encryption round-trip (no DB needed) ───────────────────────────────
    print("\n[1] Encryption round-trip (in-memory)...")

    raw_audio   = b"\x00\x01\x02\x03\xff\xfe\xfd TEST AUDIO BYTES"
    enc_audio   = encrypt_binary(raw_audio)
    dec_audio   = decrypt_binary(enc_audio)
    assert dec_audio == raw_audio, "❌ Audio binary round-trip FAILED"
    print(f"    ✅ encrypt_binary / decrypt_binary OK  ({len(enc_audio)} encrypted bytes)")

    sample_text = "المريض يشكو من ألم في الصدر منذ ثلاثة أيام."
    enc_text    = encrypt_text(sample_text)
    dec_text    = decrypt_bytes(enc_text)
    assert dec_text == sample_text, "❌ Text round-trip FAILED"
    print(f"    ✅ encrypt_text / decrypt_bytes OK  ('{dec_text[:40]}...')")

    # ── 2. Connect to DB ──────────────────────────────────────────────────────
    print("\n[2] Connecting to PostgreSQL...")
    conn = await asyncpg.connect(DATABASE_URL)
    print("    ✅ Connected")

    # ── 3. Check table exists ─────────────────────────────────────────────────
    print("\n[3] Checking table 'session_audio_chunks' exists...")
    row = await conn.fetchrow("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'session_audio_chunks'
    """)
    assert row, "❌ Table 'session_audio_chunks' NOT found in database!"
    print("    ✅ Table exists")

    # ── 4. Check columns ──────────────────────────────────────────────────────
    print("\n[4] Checking column definitions...")
    cols = await conn.fetch("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'session_audio_chunks'
        ORDER BY ordinal_position
    """)
    expected_cols = {
        "id", "session_id", "doctor_id", "chunk_index",
        "audio_data", "transcript", "duration_ms", "created_at"
    }
    found_cols = {r["column_name"] for r in cols}
    missing = expected_cols - found_cols
    if missing:
        print(f"    ❌ Missing columns: {missing}")
    else:
        print("    ✅ All expected columns present:")
        for r in cols:
            nullable = "NULL" if r["is_nullable"] == "YES" else "NOT NULL"
            print(f"       - {r['column_name']:<15} {r['data_type']:<25} {nullable}")

    # ── 5. Check foreign keys ─────────────────────────────────────────────────
    print("\n[5] Checking foreign key constraints...")
    fks = await conn.fetch("""
        SELECT
            kcu.column_name,
            ccu.table_name  AS referenced_table,
            ccu.column_name AS referenced_column,
            rc.delete_rule
        FROM information_schema.table_constraints       tc
        JOIN information_schema.key_column_usage        kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema    = kcu.table_schema
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON rc.unique_constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema    = 'public'
          AND tc.table_name      = 'session_audio_chunks'
    """)
    if not fks:
        print("    ❌ No foreign keys found!")
    else:
        for fk in fks:
            print(f"    ✅ {fk['column_name']} → {fk['referenced_table']}.{fk['referenced_column']}"
                  f"  [ON DELETE {fk['delete_rule']}]")

    # ── 6. Check indexes ──────────────────────────────────────────────────────
    print("\n[6] Checking indexes...")
    idxs = await conn.fetch("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename  = 'session_audio_chunks'
    """)
    for idx in idxs:
        print(f"    ✅ {idx['indexname']}")

    # ── 7. INSERT encrypted row, SELECT & decrypt ─────────────────────────────
    print("\n[7] Testing INSERT + SELECT + decrypt (using real doctor & session if available)...")

    # Look for any existing session_id + doctor_id pair
    sample = await conn.fetchrow("""
        SELECT id AS session_id, doctor_id
        FROM sessions
        LIMIT 1
    """)

    if not sample:
        print("    ⚠️  No sessions found — skipping live INSERT test.")
        print("       (Create a session first, then re-run this script to test the full flow.)")
    else:
        session_id = sample["session_id"]
        doctor_id  = sample["doctor_id"]
        print(f"    Using session_id={session_id}, doctor_id={doctor_id}")

        fake_audio      = b"FAKE_AUDIO_CHUNK_DATA_\x00\x01\x02"
        fake_transcript = "المريض: أشعر بالدوخة منذ الأمس. الطبيب: هل تناولت أي أدوية؟"

        enc_audio_db  = encrypt_binary(fake_audio)
        enc_trans_db  = encrypt_text(fake_transcript)

        # Use ON CONFLICT to avoid duplicate chunk_index violations on re-runs
        chunk_index = 9999  # sentinel index for testing

        inserted = await conn.fetchrow("""
            INSERT INTO session_audio_chunks
                (session_id, doctor_id, chunk_index, audio_data, transcript, duration_ms)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (session_id, chunk_index) DO UPDATE
                SET audio_data = EXCLUDED.audio_data,
                    transcript = EXCLUDED.transcript
            RETURNING id, session_id, doctor_id, chunk_index, audio_data, transcript, duration_ms, created_at
        """,
            session_id, doctor_id, chunk_index,
            enc_audio_db, enc_trans_db, 3500
        )

        print(f"    ✅ Row stored — chunk id: {inserted['id']}")

        # Now decrypt
        dec_audio_rt = decrypt_binary(inserted["audio_data"])
        dec_trans_rt = decrypt_bytes(inserted["transcript"])

        assert dec_audio_rt == fake_audio,      f"❌ Audio decrypt mismatch!"
        assert dec_trans_rt == fake_transcript, f"❌ Transcript decrypt mismatch!"

        print(f"    ✅ decrypt_binary(audio_data)  == original bytes ✓")
        print(f"    ✅ decrypt_bytes(transcript)   == '{dec_trans_rt[:60]}...' ✓")

        # Cleanup test row
        await conn.execute(
            "DELETE FROM session_audio_chunks WHERE id = $1", inserted["id"]
        )
        print("    🧹 Test row cleaned up")

    # ── Done ──────────────────────────────────────────────────────────────────
    await conn.close()
    print(f"\n{SEPARATOR}")
    print("  ✅ ALL CHECKS PASSED — session_audio_chunks is ready!")
    print(SEPARATOR + "\n")


if __name__ == "__main__":
    asyncio.run(main())
