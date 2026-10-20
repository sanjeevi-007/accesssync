from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class VisitorBase(BaseModel):
    mode: str = Field(..., min_length=1, max_length=20)
    language: str = Field(default="en", min_length=2, max_length=5)


class VisitorCreate(VisitorBase):
    pass


class VisitorUpdate(BaseModel):
    mode: Optional[str] = Field(None, min_length=1, max_length=20)
    language: Optional[str] = Field(None, min_length=2, max_length=5)


class VisitorResponse(VisitorBase):
    id: int
    is_sample: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
