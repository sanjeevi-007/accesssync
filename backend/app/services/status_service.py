from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from app.models.device import Device
from app.config import get_settings
from app.core.websocket_manager import manager

settings = get_settings()


def get_device_status(device: Device, timeout: Optional[int] = None) -> Dict[str, Any]:
    """Calculate status for a single device based on last_seen_at."""
    if timeout is None:
        timeout = settings.WS_HEARTBEAT_TIMEOUT_SECONDS

    if device.last_seen_at is None:
        return {
            "device_id": device.device_id,
            "status": "never_connected",
            "last_seen_at": None,
        }

    now = datetime.now(timezone.utc)
    seen_time = device.last_seen_at
    if seen_time.tzinfo is None:
        seen_time = seen_time.replace(tzinfo=timezone.utc)

    diff = (now - seen_time).total_seconds()
    status = "online" if diff <= timeout else "offline"

    return {
        "device_id": device.device_id,
        "status": status,
        "last_seen_at": device.last_seen_at.isoformat() if hasattr(device.last_seen_at, "isoformat") else str(device.last_seen_at),
    }


def get_all_devices_status(db: Session, timeout: Optional[int] = None) -> List[Dict[str, Any]]:
    """Return status for all active devices."""
    devices = db.query(Device).filter(Device.is_active == True).all()
    return [get_device_status(d, timeout=timeout) for d in devices]


async def broadcast_device_status(status_data: dict):
    """Broadcast device status update to all connected WebSocket clients."""
    await manager.broadcast({"type": "device_status", "data": status_data})
