from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device
from app.models.user import User
from app.core.permissions import get_current_user, verify_device_token
from app.services.status_service import get_device_status, get_all_devices_status, broadcast_device_status
from app.schemas.device import DeviceHeartbeatResponse, DeviceStatusResponse

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.post("/heartbeat", response_model=DeviceHeartbeatResponse, status_code=status.HTTP_200_OK)
async def device_heartbeat(
    device: Device = Depends(verify_device_token),
    db: Session = Depends(get_db),
):
    """Update device heartbeat timestamp and broadcast status change."""
    device.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(device)

    status_data = get_device_status(device)
    await broadcast_device_status(status_data)

    return DeviceHeartbeatResponse(
        status="ok",
        device_id=device.device_id,
    )


@router.get("/status", response_model=List[DeviceStatusResponse])
def list_device_statuses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get status (online/offline/never_connected) for all active devices."""
    statuses = get_all_devices_status(db)
    return [DeviceStatusResponse(**s) for s in statuses]


@router.get("/status/{device_id}", response_model=DeviceStatusResponse)
def get_single_device_status(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get status for a single device by device_id."""
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "DEVICE_NOT_FOUND", "message": f"Device '{device_id}' not found."}},
        )
    status_data = get_device_status(device)
    return DeviceStatusResponse(**status_data)
