import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.services.template_service import TemplateService

@pytest.mark.asyncio
async def test_create_template_success():
    mock_template_repo = MagicMock()
    mock_template_repo.create = AsyncMock(return_value={"id": uuid4(), "name": "حالة قلبية", "fields": []})
    mock_template_repo.upsert_registry_fields = AsyncMock()

    service = TemplateService(template_repo=mock_template_repo)
    doctor_id = uuid4()
    fields = [{"label": "الضغط"}, {"label": "النبض"}]
    
    res = await service.create_template(doctor_id, "حالة قلبية", fields)
    
    assert res["name"] == "حالة قلبية"
    mock_template_repo.upsert_registry_fields.assert_called_once_with(["الضغط", "النبض"])
    mock_template_repo.create.assert_called_once_with(doctor_id, "حالة قلبية", fields)

@pytest.mark.asyncio
async def test_create_template_too_many_fields_raises_error():
    mock_template_repo = MagicMock()
    service = TemplateService(template_repo=mock_template_repo)
    
    fields = [{"label": f"field_{i}"} for i in range(11)]  # 11 fields, limit is 10
    
    with pytest.raises(HTTPException) as exc_info:
        await service.create_template(uuid4(), "تمبليت كبير", fields)
        
    assert exc_info.value.status_code == 400
    assert "10 حقول كحد أقصى" in exc_info.value.detail

@pytest.mark.asyncio
async def test_create_template_empty_name_raises_error():
    mock_template_repo = MagicMock()
    service = TemplateService(template_repo=mock_template_repo)
    
    with pytest.raises(HTTPException) as exc_info:
        await service.create_template(uuid4(), " ", [{"label": "حقل"}])
        
    assert exc_info.value.status_code == 400
    assert "اسم القالب مطلوب" in exc_info.value.detail

@pytest.mark.asyncio
async def test_delete_template_unauthorized_raises_404():
    mock_template_repo = MagicMock()
    # Template not found for this doctor
    mock_template_repo.get_by_id = AsyncMock(return_value=None)
    
    service = TemplateService(template_repo=mock_template_repo)
    
    with pytest.raises(HTTPException) as exc_info:
        await service.delete_template(uuid4(), uuid4())
        
    assert exc_info.value.status_code == 404
