"""
Migration: create whatsapp_message_log table
Run once:  python migrate_whatsapp.py
"""
import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS whatsapp_message_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id  UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id   UUID REFERENCES doctors(id) ON DELETE SET NULL,
    visit_id    UUID REFERENCES visits(id) ON DELETE SET NULL,
    msg_type    VARCHAR(30) NOT NULL,
    -- 'followup_24h' | 'reminder_6m' | 'doctor_alert' | 'report'
    phone       VARCHAR(30) NOT NULL,
    content     TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'sent',
    -- 'sent' | 'failed'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_log_visit
    ON whatsapp_message_log(visit_id, msg_type);

CREATE INDEX IF NOT EXISTS idx_wa_log_patient
    ON whatsapp_message_log(patient_id, msg_type, created_at);
"""


async def run():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set in .env")

    conn = await asyncpg.connect(db_url)
    try:
        await conn.execute(CREATE_TABLE_SQL)
        print("✅ whatsapp_message_log table created (or already exists).")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
