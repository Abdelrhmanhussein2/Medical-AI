import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from uuid import uuid4, UUID
from datetime import datetime

from app.main import app
from app.core.database import db
from app.core.redis import redis_client
from app.core.security import create_access_token, get_password_hash
from app.core.encryption import decrypt_bytes

# Test configuration
TEST_DOCTOR_EMAIL_A = "test_doc_a@medical-ai.com"
TEST_DOCTOR_EMAIL_B = "test_doc_b@medical-ai.com"
TEST_ADMIN_EMAIL = "test_admin@medical-ai.com"

@pytest.fixture(autouse=True)
async def setup_database():
    # Force pool and redis reset to bind to the current event loop of this test function
    db.pool = None
    redis_client.redis = None
    
    # Connect database and redis for testing
    await db.connect()
    await redis_client.connect()
    
    # Create test users
    pw_hash = get_password_hash("password123")
    async with db.pool.acquire() as conn:
        # Clean potential leftovers
        await conn.execute("DELETE FROM admins WHERE email = $1", TEST_ADMIN_EMAIL)
        await conn.execute("DELETE FROM doctors WHERE email IN ($1, $2)", TEST_DOCTOR_EMAIL_A, TEST_DOCTOR_EMAIL_B)
        
        # Insert Doctor A
        doc_a_id = uuid4()
        await conn.execute(
            """
            INSERT INTO doctors (id, name, email, phone, password_hash, specialization, status, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, 'approved', true)
            """,
            doc_a_id, "Doctor A", TEST_DOCTOR_EMAIL_A, "1234567890", pw_hash, "General"
        )
        
        # Insert Doctor B
        doc_b_id = uuid4()
        await conn.execute(
            """
            INSERT INTO doctors (id, name, email, phone, password_hash, specialization, status, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, 'approved', true)
            """,
            doc_b_id, "Doctor B", TEST_DOCTOR_EMAIL_B, "0987654321", pw_hash, "Neurology"
        )
        
        # Insert Admin
        admin_id = uuid4()
        await conn.execute(
            """
            INSERT INTO admins (id, name, email, password_hash)
            VALUES ($1, $2, $3, $4)
            """,
            admin_id, "Test Admin", TEST_ADMIN_EMAIL, pw_hash
        )
        
    yield
    
    # Cleanup test users
    async with db.pool.acquire() as conn:
        await conn.execute("DELETE FROM admins WHERE email = $1", TEST_ADMIN_EMAIL)
        await conn.execute("DELETE FROM doctors WHERE email IN ($1, $2)", TEST_DOCTOR_EMAIL_A, TEST_DOCTOR_EMAIL_B)
        
    await db.disconnect()
    db.pool = None
    await redis_client.disconnect()
    redis_client.redis = None

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def auth_headers_doc_a():
    token = create_access_token(TEST_DOCTOR_EMAIL_A)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_doc_b():
    token = create_access_token(TEST_DOCTOR_EMAIL_B)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_admin():
    token = create_access_token(TEST_ADMIN_EMAIL)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_unauthorized_access(client):
    # Verify unauthenticated requests return 401
    response = await client.get("/api/v1/chat/threads")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_thread(client, auth_headers_doc_a):
    response = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Patient A MRI Review", "dept": "Neurology"},
        headers=auth_headers_doc_a
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Patient A MRI Review"
    assert data["dept"] == "Neurology"
    assert data["owner_type"] == "doctor"
    assert data["is_pinned"] is False
    assert "id" in data


@pytest.mark.asyncio
async def test_get_my_threads(client, auth_headers_doc_a):
    # 1. Create a thread
    await client.post(
        "/api/v1/chat/threads",
        json={"title": "Patient A MRI Review", "dept": "Neurology"},
        headers=auth_headers_doc_a
    )
    # 2. Fetch threads list for Doctor A
    response = await client.get("/api/v1/chat/threads", headers=auth_headers_doc_a)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["title"] == "Patient A MRI Review"


@pytest.mark.asyncio
async def test_update_and_pin_thread(client, auth_headers_doc_a):
    # 1. Create a thread
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Patient A MRI Review", "dept": "Neurology"},
        headers=auth_headers_doc_a
    )
    thread_id = create_resp.json()["id"]
    
    # 2. Patch thread (pin and change title)
    response = await client.patch(
        f"/api/v1/chat/threads/{thread_id}",
        json={"title": "Patient A MRI Review - Updated", "is_pinned": True},
        headers=auth_headers_doc_a
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Patient A MRI Review - Updated"
    assert data["is_pinned"] is True


@pytest.mark.asyncio
async def test_idor_prevention_threads(client, auth_headers_doc_a, auth_headers_doc_b):
    # 1. Doctor A creates a thread
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Patient A MRI Review", "dept": "Neurology"},
        headers=auth_headers_doc_a
    )
    thread_id = create_resp.json()["id"]
    
    # 2. Request from Doc B should return 403 Forbidden
    response = await client.get(f"/api/v1/chat/threads/{thread_id}", headers=auth_headers_doc_b)
    assert response.status_code == 403
    
    # 3. Modify request from Doc B should return 403
    response = await client.patch(
        f"/api/v1/chat/threads/{thread_id}",
        json={"title": "Hacked Title"},
        headers=auth_headers_doc_b
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_send_and_retrieve_encrypted_message(client, auth_headers_doc_a):
    # 1. Create thread
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Patient A MRI Review", "dept": "Neurology"},
        headers=auth_headers_doc_a
    )
    thread_id = create_resp.json()["id"]
    
    plaintext_body = "The patient shows abnormal symptoms."
    
    # 2. Post message
    msg_resp = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages",
        json={"sender_type": "user", "content": plaintext_body},
        headers=auth_headers_doc_a
    )
    assert msg_resp.status_code == 201
    msg_data = msg_resp.json()
    assert msg_data["content"] == plaintext_body
    
    # 3. Check DB storage directly (Verify field-level encryption: raw db row must be encrypted bytes)
    async with db.pool.acquire() as conn:
        row = await conn.fetchrow("SELECT content FROM chat_messages WHERE id = $1", UUID(msg_data["id"]))
        assert row is not None
        # Must be encrypted bytes
        raw_db_content = row["content"]
        assert isinstance(raw_db_content, bytes)
        assert plaintext_body.encode('utf-8') not in raw_db_content
        
        # Verify decrypt works correctly on raw db content
        decrypted = decrypt_bytes(raw_db_content)
        assert decrypted == plaintext_body

    # 4. Retrieve messages list from API (Verify API decrypts content automatically)
    list_resp = await client.get(f"/api/v1/chat/threads/{thread_id}/messages", headers=auth_headers_doc_a)
    assert list_resp.status_code == 200
    messages = list_resp.json()
    assert len(messages) >= 1
    assert messages[0]["content"] == plaintext_body


@pytest.mark.asyncio
async def test_idor_prevention_messages(client, auth_headers_doc_a, auth_headers_doc_b):
    # 1. Doctor A creates thread
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Patient A MRI Review", "dept": "Neurology"},
        headers=auth_headers_doc_a
    )
    thread_id = create_resp.json()["id"]
    
    # 2. Doc B attempts to access Doc A's thread messages
    response = await client.get(f"/api/v1/chat/threads/{thread_id}/messages", headers=auth_headers_doc_b)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_chat_isolation(client, auth_headers_admin, auth_headers_doc_a):
    # Admin creates thread
    response = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Admin Special Session"},
        headers=auth_headers_admin
    )
    assert response.status_code == 201
    admin_thread_id = response.json()["id"]
    
    # Doc A tries to view Admin's thread
    response = await client.get(f"/api/v1/chat/threads/{admin_thread_id}", headers=auth_headers_doc_a)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_thread_cascades_messages(client, auth_headers_doc_a):
    # 1. Create thread
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Patient A MRI Review", "dept": "Neurology"},
        headers=auth_headers_doc_a
    )
    thread_id = create_resp.json()["id"]
    
    # 2. Post message to thread
    await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages",
        json={"sender_type": "user", "content": "Test message to delete"},
        headers=auth_headers_doc_a
    )
    
    # 3. Verify messages exist in DB
    async with db.pool.acquire() as conn:
        before_count = await conn.fetchval("SELECT COUNT(*) FROM chat_messages WHERE thread_id = $1", UUID(thread_id))
        assert before_count >= 1
        
    # 4. Delete thread
    delete_resp = await client.delete(f"/api/v1/chat/threads/{thread_id}", headers=auth_headers_doc_a)
    assert delete_resp.status_code == 204
    
    # 5. Verify thread is deleted
    get_resp = await client.get(f"/api/v1/chat/threads/{thread_id}", headers=auth_headers_doc_a)
    assert get_resp.status_code == 403
    
    # 6. Verify cascade delete removed messages from DB
    async with db.pool.acquire() as conn:
        after_count = await conn.fetchval("SELECT COUNT(*) FROM chat_messages WHERE thread_id = $1", UUID(thread_id))
        assert after_count == 0


@pytest.mark.asyncio
async def test_invalid_uuid(client, auth_headers_doc_a):
    # Verify invalid UUID format triggers FastAPI validation error (422 Unprocessable Entity)
    response = await client.get("/api/v1/chat/threads/not-a-valid-uuid", headers=auth_headers_doc_a)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_upload_audio_message(client, auth_headers_doc_a):
    # 1. Create thread
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Audio Test Session"},
        headers=auth_headers_doc_a
    )
    assert create_resp.status_code == 201
    thread_id = create_resp.json()["id"]

    # 2. Upload dummy audio file
    files = {"file": ("test_recording.webm", b"dummy audio content bytes", "audio/webm")}
    data = {"audio_duration": "0:05"}

    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/audio",
        files=files,
        data=data,
        headers=auth_headers_doc_a
    )
    assert response.status_code == 201
    msg_data = response.json()
    assert msg_data["is_audio"] is True
    assert msg_data["audio_duration"] == "0:05"
    assert msg_data["audio_file_path"].startswith("/uploads/audio/")

    # 3. Verify message is stored encrypted in database
    async with db.pool.acquire() as conn:
        row = await conn.fetchrow("SELECT content, audio_file_path FROM chat_messages WHERE id = $1", UUID(msg_data["id"]))
        assert row["audio_file_path"].startswith("/uploads/audio/")
