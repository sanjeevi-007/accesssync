from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CriterionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    area_type: Optional[str] = Field(None, max_length=30)


class CriterionCreate(CriterionBase):
    pass


class CriterionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    area_type: Optional[str] = Field(None, max_length=30)


class CriterionResponse(CriterionBase):
    id: int
    is_sample: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
