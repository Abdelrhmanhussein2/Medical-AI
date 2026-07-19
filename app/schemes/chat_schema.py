from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any

class ThreadCreate(BaseModel):
    title: str
    dept: Optional[str] = None

class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None

class ThreadResponse(BaseModel):
    id: UUID
    owner_type: str
    owner_id: UUID
    title: str
    dept: Optional[str] = None
    is_pinned: bool
    message_count: int
    ai_context_summary: Optional[str] = None
    summary_updated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    sender_type: str # 'user' | 'ai'
    content: str
    bento_data: Optional[Any] = None
    insight_data: Optional[Any] = None
    actions_data: Optional[List[str]] = None
    is_audio: Optional[bool] = False
    audio_duration: Optional[str] = None

class MessageResponse(BaseModel):
    id: UUID
    thread_id: UUID
    sender_type: str
    content: str
    bento_data: Optional[Any] = None
    insight_data: Optional[Any] = None
    actions_data: Optional[List[str]] = None
    is_audio: bool
    audio_duration: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
