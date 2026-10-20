from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class InstructionBase(BaseModel):
    library_id: int
    area_id: int
    mode: str = Field(..., min_length=1, max_length=20)
    language: str = Field(default="en", min_length=2, max_length=5)
    priority: int = 0
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)


class InstructionCreate(InstructionBase):
    pass


class InstructionUpdate(BaseModel):
    library_id: Optional[int] = None
    area_id: Optional[int] = None
    mode: Optional[str] = Field(None, min_length=1, max_length=20)
    language: Optional[str] = Field(None, min_length=2, max_length=5)
    priority: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None
    is_active: Optional[bool] = None


class InstructionResponse(InstructionBase):
    id: int
    is_active: bool
    is_sample: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
