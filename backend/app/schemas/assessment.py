from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict, Field


class AssessmentBase(BaseModel):
    library_id: int
    area_id: int
    criterion_id: int
    status: str = Field(default="not_assessed", max_length=20)
    notes: Optional[str] = None


class AssessmentCreate(AssessmentBase):
    pass


class AssessmentUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None


class AssessmentResponse(AssessmentBase):
    id: int
    assessed_by: Optional[int] = None
    is_sample: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ScoreBreakdown(BaseModel):
    pass_: int = Field(..., serialization_alias="pass")
    needs_improvement: int
    fail: int
    not_assessed: int


class AssessmentScoreResponse(BaseModel):
    library_id: int
    score: Optional[float]
    label: str
    total_assessed: int
    breakdown: Dict[str, int]
