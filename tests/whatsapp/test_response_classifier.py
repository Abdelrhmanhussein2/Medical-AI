import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.whatsapp.response_classifier import ResponseClassifier

@pytest.mark.asyncio
async def test_classify_via_mock_openai():
    # Setup mock OpenAI response
    mock_openai = MagicMock()
    mock_openai.chat.completions.create = AsyncMock()
    
    mock_choice = MagicMock()
    mock_choice.message.content = '{"status": "severe_pain"}'
    
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_openai.chat.completions.create.return_value = mock_response

    classifier = ResponseClassifier(openai_client=mock_openai)
    status = await classifier.classify("أشعر بألم شديد")
    
    assert status == "severe_pain"
    mock_openai.chat.completions.create.assert_called_once()

@pytest.mark.asyncio
async def test_classify_via_rules_severe():
    # Ensure keyword fallback classifies severe correctly
    classifier = ResponseClassifier(openai_client=None)
    status = await classifier.classify("أنا تعبان جدا وبموت من الوجع")
    assert status == "severe_pain"

@pytest.mark.asyncio
async def test_classify_via_rules_mild():
    classifier = ResponseClassifier(openai_client=None)
    status = await classifier.classify("في شوية حرارة ومغص خفيف")
    assert status == "mild_pain"

@pytest.mark.asyncio
async def test_classify_via_rules_fine():
    classifier = ResponseClassifier(openai_client=None)
    status = await classifier.classify("الحمد لله انا بخير وكويس")
    assert status == "fine"
