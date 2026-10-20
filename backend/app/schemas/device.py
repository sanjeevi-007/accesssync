from typing import Optional
from pydantic import BaseModel


class DeviceHeartbeatResponse(BaseModel):
    status: str
    device_id: str


class DeviceStatusResponse(BaseModel):
    device_id: str
    status: str
    last_seen_at: Optional[str] = None
