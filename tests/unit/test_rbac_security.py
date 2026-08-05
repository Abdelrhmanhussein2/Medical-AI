import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from uuid import uuid4
from app.main import app
from app.core.dependencies import get_current_user, require_admin, require_role
from app.core.redis import redis_client

client = TestClient(app)

# Mock user fixtures
mock_doctor_user = {
    "id": str(uuid4()),
    "email": "doctor@test.com",
    "name": "Dr. House",
    "role": "doctor",
    "is_active": True
}

mock_admin_user = {
    "id": str(uuid4()),
    "email": "admin@test.com",
    "name": "Admin Boss",
    "role": "admin"
}

@pytest.fixture
def override_doctor_auth():
    async def mock_doctor():
        return mock_doctor_user
    app.dependency_overrides[get_current_user] = mock_doctor
    yield
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture
def override_admin_auth():
    async def mock_admin():
        return mock_admin_user
    app.dependency_overrides[get_current_user] = mock_admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


def test_admins_endpoint_unauthenticated():
    """
    1. Unauthenticated requests to /admins/* should return 401 Unauthorized
    """
    response = client.get("/api/v1/admins/doctors")
    assert response.status_code == 401


def test_admins_endpoint_forbidden_for_doctor(override_doctor_auth):
    """
    2. Authenticated Doctor requesting /admins/* should return 403 Forbidden
    """
    response = client.get("/api/v1/admins/doctors")
    assert response.status_code == 403
    assert "غير مصرح" in response.json()["detail"] or "Forbidden" in response.json()["detail"]


def test_admins_endpoint_allowed_for_admin(override_admin_auth):
    """
    3. Authenticated Admin requesting /admins/* should return 200 OK
    """
    from app.services.admin_service import admin_service
    with patch.object(admin_service, "get_all_doctors", new_callable=AsyncMock) as mock_get_docs:
        mock_get_docs.return_value = []
        response = client.get("/api/v1/admins/doctors")
        assert response.status_code == 200
        mock_get_docs.assert_called_once()


@pytest.mark.asyncio
async def test_token_blacklist_validation():
    """
    4. Validates that a blacklisted token is rejected with 401 Unauthorized        
    """
    from app.core.dependencies import is_token_blacklisted, blacklist_token        
    from unittest.mock import MagicMock

    # Generate a mock token key
    token = f"test_jwt_token_{uuid4()}"

    # Mock redis_client
    redis_store = {}
    
    mock_redis = MagicMock()
    mock_redis.exists = AsyncMock(side_effect=lambda key: 1 if key in redis_store else 0)
    mock_redis.set = AsyncMock(side_effect=lambda key, val, ex=None: redis_store.__setitem__(key, val))
    mock_redis.delete = AsyncMock(side_effect=lambda key: redis_store.pop(key, None))

    with patch.object(redis_client, "redis", mock_redis), \
         patch.object(redis_client, "connect", new_callable=AsyncMock):

        # Assert not blacklisted initially
        assert await is_token_blacklisted(token) is False

        # Blacklist the token with 5 seconds TTL
        await blacklist_token(token, 5)

        # Assert blacklisted now
        assert await is_token_blacklisted(token) is True

        # Cleanup
        await redis_client.redis.delete(f"bl:{token}")
        assert await is_token_blacklisted(token) is False
