from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AreaBase(BaseModel):
    library_id: int
    name: str = Field(..., min_length=1, max_length=200)
    area_type: str = Field(..., min_length=1, max_length=30)
    floor: int
    description: Optional[str] = None


class AreaCreate(AreaBase):
    pass


class AreaUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    area_type: Optional[str] = Field(None, min_length=1, max_length=30)
    floor: Optional[int] = None
    description: Optional[str] = None


class AreaResponse(AreaBase):
    id: int
    is_sample: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
