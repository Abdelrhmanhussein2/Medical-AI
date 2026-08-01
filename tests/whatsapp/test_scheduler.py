import pytest
from unittest.mock import AsyncMock, MagicMock
from app.scheduler.whatsapp_scheduler import WhatsAppScheduler
from app.services.whatsapp_service import WhatsAppService

@pytest.mark.asyncio
async def test_scheduler_followup_job_acquires_lock():
    mock_service = MagicMock(spec=WhatsAppService)
    mock_service.process_followup_24h = AsyncMock(return_value=5)
    
    mock_redis = AsyncMock()
    # Mock lock acquisition: return True on first call
    mock_redis.set.return_value = True

    scheduler = WhatsAppScheduler(service=mock_service, redis=mock_redis)
    await scheduler.run_followup_24h_job()
    
    # Assert lock was checked/set and service method was executed
    mock_redis.set.assert_called_once_with("wa:lock:followup24h", "1", ex=1800, nx=True)
    mock_service.process_followup_24h.assert_called_once()

@pytest.mark.asyncio
async def test_scheduler_followup_job_skips_when_locked():
    mock_service = MagicMock(spec=WhatsAppService)
    mock_service.process_followup_24h = AsyncMock()
    
    mock_redis = AsyncMock()
    # Mock lock acquisition: return None if already locked
    mock_redis.set.return_value = None

    scheduler = WhatsAppScheduler(service=mock_service, redis=mock_redis)
    await scheduler.run_followup_24h_job()
    
    # Assert lock set attempted, but service method skipped
    mock_redis.set.assert_called_once_with("wa:lock:followup24h", "1", ex=1800, nx=True)
    mock_service.process_followup_24h.assert_not_called()


@pytest.mark.asyncio
async def test_scheduler_due_reminders_job_acquires_lock():
    mock_service = MagicMock(spec=WhatsAppService)
    mock_service.process_due_reminders = AsyncMock(return_value=3)
    
    mock_redis = AsyncMock()
    mock_redis.set.return_value = True

    scheduler = WhatsAppScheduler(service=mock_service, redis=mock_redis)
    await scheduler.run_due_reminders_job()
    
    mock_redis.set.assert_called_once_with("wa:lock:due_reminders", "1", ex=50, nx=True)
    mock_service.process_due_reminders.assert_called_once()


@pytest.mark.asyncio
async def test_scheduler_due_reminders_job_skips_when_locked():
    mock_service = MagicMock(spec=WhatsAppService)
    mock_service.process_due_reminders = AsyncMock()
    
    mock_redis = AsyncMock()
    mock_redis.set.return_value = None

    scheduler = WhatsAppScheduler(service=mock_service, redis=mock_redis)
    await scheduler.run_due_reminders_job()
    
    mock_redis.set.assert_called_once_with("wa:lock:due_reminders", "1", ex=50, nx=True)
    mock_service.process_due_reminders.assert_not_called()


@pytest.mark.asyncio
async def test_scheduler_safety_net_job_acquires_lock():
    mock_service = MagicMock(spec=WhatsAppService)
    mock_service.run_safety_net_scan = AsyncMock(return_value=2)
    
    mock_redis = AsyncMock()
    mock_redis.set.return_value = True

    scheduler = WhatsAppScheduler(service=mock_service, redis=mock_redis)
    await scheduler.run_reminder_safety_net_job()
    
    mock_redis.set.assert_called_once_with("wa:lock:safety_net", "1", ex=18000, nx=True)
    mock_service.run_safety_net_scan.assert_called_once()

