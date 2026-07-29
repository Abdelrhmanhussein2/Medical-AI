import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock
from app.services.whatsapp.evolution_client import EvolutionClient, EvolutionAPIError

@pytest.mark.asyncio
async def test_evolution_client_send_text_success():
    mock_http = MagicMock(spec=httpx.AsyncClient)
    mock_http.post = AsyncMock()
    
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {"key": {"id": "msg_123"}}
    mock_http.post.return_value = mock_response

    client = EvolutionClient(
        base_url="http://test-api:8080",
        api_key="key123",
        instance="SBR-AI",
        http_client=mock_http
    )
    
    result = await client.send_text("966500000000", "hello")
    assert result == {"key": {"id": "msg_123"}}
    
    # Assert correct post details
    mock_http.post.assert_called_once()
    args, kwargs = mock_http.post.call_args
    assert args[0] == "http://test-api:8080/message/sendText/SBR-AI"
    assert kwargs["headers"] == {"apikey": "key123", "Content-Type": "application/json"}
    assert kwargs["json"]["number"] == "966500000000"
    assert kwargs["json"]["text"] == "hello"

@pytest.mark.asyncio
async def test_evolution_client_send_text_failure():
    mock_http = MagicMock(spec=httpx.AsyncClient)
    mock_http.post = AsyncMock()
    
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 400
    mock_response.text = "Invalid Instance"
    mock_http.post.return_value = mock_response

    client = EvolutionClient(
        base_url="http://test-api:8080",
        api_key="key123",
        instance="SBR-AI",
        http_client=mock_http
    )
    
    with pytest.raises(EvolutionAPIError):
        await client.send_text("966500000000", "hello")
