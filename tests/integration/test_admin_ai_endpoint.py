import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.dependencies import get_current_user
from uuid import uuid4
from datetime import datetime

client = TestClient(app)

# Helper mock for admin user
mock_admin = {
    "id": uuid4(),
    "email": "admin@test.com",
    "name": "Super Admin",
    "role": "admin"
}

async def mock_get_current_admin():
    return mock_admin

@pytest.fixture
def override_admin_auth():
    app.dependency_overrides[get_current_user] = mock_get_current_admin
    yield
    app.dependency_overrides.pop(get_current_user, None)

def test_admin_generate_ai_reply_unauthorized():
    response = client.post(f"/api/v1/chat/threads/{uuid4()}/generate")
    assert response.status_code == 401

def test_admin_generate_ai_reply_success(override_admin_auth):
    from app.services.admin_ai_service import AdminAIEngineService
    from app.services.chat_service import ChatService
    
    thread_id = uuid4()
    mock_msg = {
        "id": uuid4(),
        "thread_id": thread_id,
        "sender_type": "ai",
        "content": "هذا رد الإدارة إحصائيات النظام جاهزة.",
        "is_audio": False,
        "created_at": datetime.now()
    }
    
    with patch.object(ChatService, "_assert_thread_owner", new_callable=AsyncMock) as mock_owner:
        mock_owner.return_value = None
        
        with patch.object(AdminAIEngineService, "generate_ai_response", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = mock_msg
            
            response = client.post(f"/api/v1/chat/threads/{thread_id}/generate")
            
            assert response.status_code == 201
            data = response.json()
            assert data["sender_type"] == "ai"
            assert "إحصائيات النظام" in data["content"]
            mock_gen.assert_called_once_with(str(thread_id), str(mock_admin["id"]))
