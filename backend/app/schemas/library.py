from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class LibraryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    floors: int = Field(default=1, ge=1)


class LibraryCreate(LibraryBase):
    pass


class LibraryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    floors: Optional[int] = Field(None, ge=1)


class LibraryResponse(LibraryBase):
    id: int
    is_sample: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    areas_count: int = 0

    model_config = ConfigDict(from_attributes=True)
