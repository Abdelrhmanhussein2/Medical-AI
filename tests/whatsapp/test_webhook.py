import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
from app.main import app
from app.services.whatsapp_service import WhatsAppService
from app.controllers.whatsapp_controller import get_whatsapp_service

# Mock WhatsAppService injection for test
@pytest.fixture
def mock_service():
    service = MagicMock(spec=WhatsAppService)
    service.handle_incoming_message = AsyncMock(return_value=True)
    return service

def test_webhook_upsert_event(mock_service):
    # Override get_whatsapp_service dependency
    app.dependency_overrides[get_whatsapp_service] = lambda: mock_service
    client = TestClient(app)

    payload = {
        "event": "messages.upsert",
        "instance": "SBR-AI",
        "data": {
            "key": {
                "remoteJid": "966512345678@s.whatsapp.net",
                "fromMe": False,
                "id": "MSG_11"
            },
            "pushName": "Ahmad",
            "messageType": "conversation",
            "message": {
                "conversation": "بخير والحمد لله"
            }
        }
    }

    response = client.post("/api/v1/whatsapp/webhook", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "processed"}
    
    mock_service.handle_incoming_message.assert_called_once_with(
        "966512345678",
        "بخير والحمد لله"
    )
    
    # Cleanup dependency overrides
    app.dependency_overrides.clear()

def test_webhook_ignored_event(mock_service):
    app.dependency_overrides[get_whatsapp_service] = lambda: mock_service
    client = TestClient(app)

    payload = {
        "event": "connection.update",
        "instance": "SBR-AI",
        "data": {}
    }

    response = client.post("/api/v1/whatsapp/webhook", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "ignored"
    mock_service.handle_incoming_message.assert_not_called()
    
    app.dependency_overrides.clear()

