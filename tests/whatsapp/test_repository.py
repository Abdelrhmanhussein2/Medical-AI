import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, ANY
from app.services.whatsapp.repository import WhatsAppRepository

@pytest.mark.asyncio
async def test_get_visits_due_followup_24h():
    mock_pool = MagicMock()
    mock_conn = AsyncMock()
    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn

    # Setup database row return values
    mock_rows = [
        {
            "visit_id": uuid4(),
            "created_at": "2026-07-28T12:00:00",
            "notes": "Instruction",
            "patient_id": uuid4(),
            "patient_name": "Ahmad",
            "patient_phone": "0511111111",
            "doctor_id": uuid4(),
            "doctor_name": "Dr. Salem"
        }
    ]
    mock_conn.fetch.return_value = mock_rows

    repo = WhatsAppRepository(db_pool=mock_pool)
    result = await repo.get_visits_due_followup_24h()
    
    assert len(result) == 1
    assert result[0]["patient_name"] == "Ahmad"
    mock_conn.fetch.assert_called_once()

@pytest.mark.asyncio
async def test_get_patient_by_phone():
    mock_pool = MagicMock()
    mock_conn = AsyncMock()
    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn

    mock_row = {
        "patient_id": uuid4(),
        "patient_name": "Salem",
        "patient_phone": "0500000000",
        "doctor_id": uuid4(),
        "doctor_name": "Dr. Khaled",
        "doctor_phone": "0522222222"
    }
    mock_conn.fetchrow.return_value = mock_row

    repo = WhatsAppRepository(db_pool=mock_pool)
    result = await repo.get_patient_by_phone("966500000000")
    
    assert result is not None
    assert result["patient_name"] == "Salem"
    # The digits should match the query parameter logic (last 9 digits: '500000000')
    mock_conn.fetchrow.assert_called_once_with(
        ANY,
        "500000000"
    )
