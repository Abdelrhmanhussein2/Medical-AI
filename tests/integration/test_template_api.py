import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.dependencies import get_current_user
from uuid import uuid4
from datetime import datetime

# Setup test client
client = TestClient(app)

# Helper mock for doctor user
mock_doctor = {
    "id": uuid4(),
    "email": "doctor@test.com",
    "name": "Dr. Test",
    "role": "doctor",
    "is_active": True
}

async def mock_get_current_doctor():
    return mock_doctor

@pytest.fixture
def override_auth():
    app.dependency_overrides[get_current_user] = mock_get_current_doctor
    yield
    app.dependency_overrides.pop(get_current_user, None)

def test_list_templates_unauthorized():
    # Without override_auth, it should return 401
    response = client.get("/api/v1/templates/")
    assert response.status_code == 401

def test_list_templates_success(override_auth):
    from app.services.template_service import template_service
    
    mock_data = [
        {
            "id": uuid4(),
            "doctor_id": mock_doctor["id"],
            "name": "قالب 1",
            "fields": [{"label": "الضغط"}],
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    ]
    
    with patch.object(template_service, "list_templates", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = mock_data
        
        response = client.get("/api/v1/templates/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "قالب 1"

def test_create_template_validation_error(override_auth):
    # Try creating with 11 fields (limit is 10)
    payload = {
        "name": "تمبليت ضخم",
        "fields": [{"label": f"label_{i}"} for i in range(11)]
    }
    response = client.post("/api/v1/templates/", json=payload)
    assert response.status_code == 422  # Pydantic validation error (max_length=10)
