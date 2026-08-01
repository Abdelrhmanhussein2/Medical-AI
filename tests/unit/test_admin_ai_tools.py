import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai_tools.admin_tools import (
    tool_get_system_stats,
    tool_get_doctor_performance,
    tool_get_revenue_report,
    tool_send_report_to_admin
)

@pytest.mark.asyncio
async def test_tool_get_system_stats():
    mock_conn = AsyncMock()
    # Mocking total counts returned from fetchval calls
    mock_conn.fetchval.side_effect = [10, 100, 250, 5]
    
    res = await tool_get_system_stats({}, str(uuid4()), mock_conn)
    
    assert res["status"] == "success"
    assert res["data"]["total_doctors"] == 10
    assert res["data"]["total_patients"] == 100
    assert res["data"]["total_appointments"] == 250
    assert res["data"]["active_subscriptions"] == 5

@pytest.mark.asyncio
async def test_tool_get_doctor_performance_not_found():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = None # Doctor not found
    
    res = await tool_get_doctor_performance({"doctor_name": "احمد"}, str(uuid4()), mock_conn)
    
    assert res["status"] == "error"
    assert "لم يتم العثور على طبيب" in res["message"]

@pytest.mark.asyncio
async def test_tool_get_revenue_report():
    mock_conn = AsyncMock()
    mock_conn.fetchval.return_value = 1500.50
    
    res = await tool_get_revenue_report({}, str(uuid4()), mock_conn)
    
    assert res["status"] == "success"
    assert res["data"]["monthly_recurring_revenue_usd"] == 1500.50

@pytest.mark.asyncio
async def test_tool_send_report_to_admin_no_phone():
    mock_conn = AsyncMock()
    mock_conn.fetchrow.return_value = {"phone": None} # Admin has no phone
    
    res = await tool_send_report_to_admin({"report_text": "تقرير جديد"}, str(uuid4()), mock_conn)
    
    assert res["status"] == "error"
    assert "رقم هاتف الأدمن غير مسجل" in res["message"]
