import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from uuid import uuid4, UUID
from datetime import datetime

from app.main import app
from app.core.database import db
from app.core.redis import redis_client
from app.core.security import create_access_token, get_password_hash

TEST_DOC_EMAIL = "test_audio_doc@medical-ai.com"
TEST_OTHER_DOC_EMAIL = "test_audio_other_doc@medical-ai.com"

@pytest.fixture(autouse=True)
async def setup_database():
    db.pool = None
    redis_client.redis = None
    await db.connect()
    await redis_client.connect()
    
    pw_hash = get_password_hash("password123")
    async with db.pool.acquire() as conn:
        await conn.execute("DELETE FROM doctors WHERE email IN ($1, $2)", TEST_DOC_EMAIL, TEST_OTHER_DOC_EMAIL)
        
        doc_id = uuid4()
        await conn.execute(
            """
            INSERT INTO doctors (id, name, email, phone, password_hash, specialization, status, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, 'approved', true)
            """,
            doc_id, "Audio Doc", TEST_DOC_EMAIL, "1112223334", pw_hash, "General"
        )
        
        other_doc_id = uuid4()
        await conn.execute(
            """
            INSERT INTO doctors (id, name, email, phone, password_hash, specialization, status, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, 'approved', true)
            """,
            other_doc_id, "Other Doc", TEST_OTHER_DOC_EMAIL, "5556667778", pw_hash, "Neurology"
        )
        
    yield
    
    async with db.pool.acquire() as conn:
        await conn.execute("DELETE FROM doctors WHERE email IN ($1, $2)", TEST_DOC_EMAIL, TEST_OTHER_DOC_EMAIL)
        
    await db.disconnect()
    db.pool = None
    await redis_client.disconnect()
    redis_client.redis = None

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def auth_headers_doc():
    token = create_access_token(TEST_DOC_EMAIL)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_other_doc():
    token = create_access_token(TEST_OTHER_DOC_EMAIL)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_audio_upload_validation_failed_extension(client, auth_headers_doc):
    # 1. Create a thread
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Audio Pipeline Test"},
        headers=auth_headers_doc
    )
    thread_id = create_resp.json()["id"]
    
    # 2. Upload with invalid extension
    files = {"file": ("malicious.exe", b"some content", "application/octet-stream")}
    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/audio",
        files=files,
        headers=auth_headers_doc
    )
    assert response.status_code == 400
    assert "نوع الملف غير مدعوم" in response.json()["detail"]


@pytest.mark.asyncio
async def test_audio_upload_validation_failed_magic_bytes(client, auth_headers_doc):
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Audio Pipeline Test"},
        headers=auth_headers_doc
    )
    thread_id = create_resp.json()["id"]
    
    # 3. Upload with correct extension but wrong magic bytes (not audio header)
    files = {"file": ("recording.mp3", b"this is raw text content", "audio/mpeg")}
    response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/audio",
        files=files,
        headers=auth_headers_doc
    )
    assert response.status_code == 400
    assert "محتوى الملف لا يطابق" in response.json()["detail"]


@pytest.mark.asyncio
async def test_audio_upload_success_and_retry(client, auth_headers_doc, auth_headers_other_doc):
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Audio Pipeline Test"},
        headers=auth_headers_doc
    )
    thread_id = create_resp.json()["id"]
    
    # 1. Mocking OpenAI call to simulate a transient error that recovers on 2nd attempt
    mock_transcription = AsyncMock()
    mock_transcription.create.side_effect = [
        ConnectionError("Transient connection issue"),
        "Hello from transcribed audio"
    ]
    
    # Valid WebM header is 1A 45 DF A3
    valid_webm_bytes = b"\x1a\x45\xdf\xa3\x9f\x81\x01\x02\x03\x04\x05\x06"
    files = {"file": ("audio.webm", valid_webm_bytes, "audio/webm")}
    
    with patch("openai.resources.audio.transcriptions.AsyncTranscriptions", return_value=mock_transcription):
        response = await client.post(
            f"/api/v1/chat/threads/{thread_id}/audio",
            files=files,
            headers=auth_headers_doc
        )
        assert response.status_code == 201
        data = response.json()
        assert data["is_audio"] is True
        assert data["transcription_status"] == "completed"
        assert data["content"] == "Hello from transcribed audio"
        message_id = data["id"]
        
    # 2. Test secure audio file download authorization
    # Owner Doctor can access
    audio_response = await client.get(
        f"/api/v1/chat/messages/{message_id}/audio",
        headers=auth_headers_doc
    )
    assert audio_response.status_code == 200
    assert audio_response.content == valid_webm_bytes
    
    # Non-owner Doctor B is Forbidden (403)
    other_audio_response = await client.get(
        f"/api/v1/chat/messages/{message_id}/audio",
        headers=auth_headers_other_doc
    )
    assert other_audio_response.status_code == 403
    
    # Unauthenticated user is Unauthorized (401)
    unauth_audio_response = await client.get(
        f"/api/v1/chat/messages/{message_id}/audio"
    )
    assert unauth_audio_response.status_code == 401


@pytest.mark.asyncio
async def test_transcription_permanent_failure_and_manual_retry(client, auth_headers_doc, auth_headers_other_doc):
    create_resp = await client.post(
        "/api/v1/chat/threads",
        json={"title": "Audio Pipeline Test"},
        headers=auth_headers_doc
    )
    thread_id = create_resp.json()["id"]
    
    # 1. Mocking OpenAI call to simulate a permanent failure (e.g. invalid API key / bad request)
    mock_transcription = AsyncMock()
    from openai import APIStatusError
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_transcription.create.side_effect = APIStatusError("Bad Request", response=mock_response, body=None)
    
    valid_webm_bytes = b"\x1a\x45\xdf\xa3\x9f\x81\x01\x02\x03\x04\x05\x06"
    files = {"file": ("audio.webm", valid_webm_bytes, "audio/webm")}
    
    with patch("openai.resources.audio.transcriptions.AsyncTranscriptions", return_value=mock_transcription):
        response = await client.post(
            f"/api/v1/chat/threads/{thread_id}/audio",
            files=files,
            headers=auth_headers_doc
        )
        assert response.status_code == 201
        data = response.json()
        assert data["is_audio"] is True
        assert data["transcription_status"] == "failed"
        assert "[فشل التفريغ الصوتي" in data["content"]
        message_id = data["id"]
        
    # 2. Test retry endpoint - unauthorized doctor B
    retry_response = await client.post(
        f"/api/v1/chat/threads/{thread_id}/messages/{message_id}/retry-transcription",
        headers=auth_headers_other_doc
    )
    assert retry_response.status_code == 403
    
    # 3. Test retry endpoint - authorized doctor A - mock success this time
    mock_transcription_success = AsyncMock()
    mock_transcription_success.create.return_value = "Recovered text from retry transcription"
    
    with patch("openai.resources.audio.transcriptions.AsyncTranscriptions", return_value=mock_transcription_success):
        retry_response = await client.post(
            f"/api/v1/chat/threads/{thread_id}/messages/{message_id}/retry-transcription",
            headers=auth_headers_doc
        )
        assert retry_response.status_code == 200
        retry_data = retry_response.json()
        assert retry_data["transcription_status"] == "completed"
        assert retry_data["content"] == "Recovered text from retry transcription"
