from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SettingBase(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: str
    description: Optional[str] = None


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None


class SettingResponse(SettingBase):
    id: int
    is_sample: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
