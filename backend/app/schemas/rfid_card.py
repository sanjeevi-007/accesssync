from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class RfidCardBase(BaseModel):
    uid: str = Field(..., pattern=r"^[0-9A-F]{8,20}$", description="Uppercase hex string, 8 to 20 characters")
    visitor_id: int
    label: Optional[str] = Field(None, max_length=100)


class RfidCardCreate(RfidCardBase):
    pass


class RfidCardUpdate(BaseModel):
    label: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class RfidCardResponse(BaseModel):
    id: int
    uid: str
    visitor_id: int
    label: Optional[str] = None
    is_active: bool
    is_sample: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
