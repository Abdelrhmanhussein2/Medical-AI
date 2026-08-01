import pytest
import time
from uuid import uuid4, UUID
from unittest.mock import AsyncMock, MagicMock, ANY
from app.services.whatsapp.reminder_repository import ReminderRepository
from app.services.whatsapp_service import WhatsAppService

@pytest.mark.asyncio
async def test_enqueue_reminder():
    mock_redis = AsyncMock()
    repo = ReminderRepository(redis=mock_redis)
    
    appt_id = str(uuid4())
    await repo.enqueue_reminder(appt_id, "24h", 123456789.0)
    
    mock_redis.zadd.assert_called_once_with(
        "wa:reminder_queue",
        {f"{appt_id}:24h": 123456789.0}
    )

@pytest.mark.asyncio
async def test_get_due_reminders():
    mock_redis = AsyncMock()
    mock_redis.zrangebyscore.return_value = ["appt1:24h", "appt2:4h"]
    
    repo = ReminderRepository(redis=mock_redis)
    due = await repo.get_due_reminders(time.time())
    
    assert len(due) == 2
    assert due[0]["appointment_id"] == "appt1"
    assert due[0]["reminder_type"] == "24h"
    assert due[1]["appointment_id"] == "appt2"
    assert due[1]["reminder_type"] == "4h"

@pytest.mark.asyncio
async def test_process_due_reminders_sends_messages():
    mock_redis = AsyncMock()
    appt_uuid_str = str(uuid4())
    mock_redis.zrangebyscore.return_value = [f"{appt_uuid_str}:24h"]
    
    mock_pool = MagicMock()
    mock_conn = AsyncMock()
    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn
    
    # has_been_sent -> False
    # get_appointment_reminder_details -> details
    mock_conn.fetchrow.side_effect = [
        None,  # has_been_sent check returns None (meaning not sent)
        {
            "appointment_id": UUID(appt_uuid_str),
            "appointment_date": "2026-08-02",
            "appointment_time": "14:00:00",
            "status": "scheduled",
            "patient_id": uuid4(),
            "patient_name": "احمد",
            "patient_phone": "0512345678",
            "doctor_id": uuid4(),
            "doctor_name": "د. علي"
        }
    ]
    
    service = WhatsAppService(redis=mock_redis)
    service.repo = MagicMock()
    service.repo.pool = mock_pool
    service.reminder_repo = ReminderRepository(db_pool=mock_pool, redis=mock_redis)
    
    # Mock message sending
    service.send_message = AsyncMock(return_value=True)
    
    count = await service.process_due_reminders()
    
    assert count == 1
    service.send_message.assert_called_once()
    mock_redis.zrem.assert_called_once_with("wa:reminder_queue", f"{appt_uuid_str}:24h")
