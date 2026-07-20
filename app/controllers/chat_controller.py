from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.core.dependencies import get_current_user
from app.schemes.chat_schema import (
    ThreadCreate, ThreadUpdate, ThreadResponse,
    MessageCreate, MessageResponse
)
from app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat"])

def _verify_chat_user(current_user: dict):
    """
    التحقق من أن المستخدم لديه الصلاحية لاستخدام الشات.
    يسمح فقط للأطباء والمدراء (Doctors & Admins).
    """
    role = current_user.get("role")
    if role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="هذه الخاصية متاحة فقط للأطباء والمدراء."
        )
    return str(current_user["id"]), role

@router.post("/threads", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_thread(
    data: ThreadCreate,
    current_user: dict = Depends(get_current_user)
):
    owner_id, owner_type = _verify_chat_user(current_user)
    thread = await ChatService.create_thread(owner_id, owner_type, data)
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="فشل إنشاء محادثة جديدة."
        )
    return thread

@router.get("/threads", response_model=List[ThreadResponse])
async def get_my_threads(
    current_user: dict = Depends(get_current_user)
):
    owner_id, owner_type = _verify_chat_user(current_user)
    return await ChatService.get_my_threads(owner_id, owner_type)

@router.get("/threads/{thread_id}", response_model=ThreadResponse)
async def get_thread_by_id(
    thread_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    owner_id, owner_type = _verify_chat_user(current_user)
    return await ChatService.get_thread_by_id(str(thread_id), owner_id, owner_type)

@router.patch("/threads/{thread_id}", response_model=ThreadResponse)
async def update_thread(
    thread_id: UUID,
    data: ThreadUpdate,
    current_user: dict = Depends(get_current_user)
):
    owner_id, owner_type = _verify_chat_user(current_user)
    updated = await ChatService.update_thread(str(thread_id), owner_id, owner_type, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="فشل تحديث المحادثة."
        )
    return updated

@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    owner_id, owner_type = _verify_chat_user(current_user)
    deleted = await ChatService.delete_thread(str(thread_id), owner_id, owner_type)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="فشل حذف المحادثة."
        )
    return None

@router.post("/threads/{thread_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def add_message(
    thread_id: UUID,
    data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    owner_id, owner_type = _verify_chat_user(current_user)
    message = await ChatService.add_message(str(thread_id), owner_id, owner_type, data)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="فشل إرسال الرسالة."
        )
    return message

@router.get("/threads/{thread_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    thread_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[datetime] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    owner_id, owner_type = _verify_chat_user(current_user)
    return await ChatService.get_messages(str(thread_id), owner_id, owner_type, limit, before)

@router.delete("/threads/{thread_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    thread_id: UUID,
    message_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    owner_id, owner_type = _verify_chat_user(current_user)
    deleted = await ChatService.delete_message(str(message_id), str(thread_id), owner_id, owner_type)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="فشل حذف الرسالة."
        )
    return None

@router.post("/threads/{thread_id}/generate", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def generate_ai_reply(
    thread_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    owner_id, owner_type = _verify_chat_user(current_user)
    message = await ChatService.generate_ai_response(str(thread_id), owner_id, owner_type)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="فشل إنشاء رد الذكاء الاصطناعي."
        )
    return message
