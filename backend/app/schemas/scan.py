from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class ScanRequest(BaseModel):
    event_id: str
    uid: str


class ScanResponse(BaseModel):
    result: str
    reason: Optional[str] = None
    mode: Optional[str] = None
    instructions: Optional[List[Dict[str, Any]]] = None
    duplicate: Optional[bool] = None


class ScanEventResponse(BaseModel):
    id: int
    event_id: str
    card_uid: str
    result: str
    reason: Optional[str] = None
    mode: Optional[str] = None
    instruction_snapshot: Optional[str] = None
    device_id: Optional[int] = None
    is_sample: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CaptureNextResponse(BaseModel):
    uid: Optional[str] = None
    message: str
