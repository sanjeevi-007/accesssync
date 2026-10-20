from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device
from app.models.scan_event import ScanEvent
from app.models.user import User
from app.core.permissions import get_current_user, verify_device_token
from app.services.scan_service import process_scan
from app.schemas.scan import ScanRequest, ScanEventResponse, CaptureNextResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/rfid/scans", tags=["scans"])


@router.post("", status_code=status.HTTP_200_OK)
@router.post("/", status_code=status.HTTP_200_OK, include_in_schema=False)
async def handle_rfid_scan(
    payload: ScanRequest,
    device: Device = Depends(verify_device_token),
    db: Session = Depends(get_db),
):
    """Process an RFID scan event sent from an authenticated ESP32 device."""
    return await process_scan(db, payload.event_id, payload.uid, device)


@router.get("", response_model=PaginatedResponse[ScanEventResponse])
def list_scans(
    result: Optional[str] = Query(None),
    card_uid: Optional[str] = Query(None),
    device_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List historical scan events with pagination and optional filtering."""
    query = db.query(ScanEvent)
    if result is not None:
        query = query.filter(ScanEvent.result == result)
    if card_uid is not None:
        query = query.filter(ScanEvent.card_uid == card_uid)
    if device_id is not None:
        query = query.filter(ScanEvent.device_id == device_id)

    total = query.count()
    items = query.order_by(ScanEvent.id.desc()).offset(skip).limit(limit).all()

    return PaginatedResponse[ScanEventResponse](
        items=[ScanEventResponse.model_validate(e) for e in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/capture-next", response_model=CaptureNextResponse)
def capture_next_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Capture UID from the next physical scan (within 30 seconds)."""
    now = datetime.now(timezone.utc)
    recent_event = db.query(ScanEvent).order_by(ScanEvent.id.desc()).first()

    if recent_event and recent_event.created_at:
        event_time = recent_event.created_at
        if event_time.tzinfo is None:
            event_time = event_time.replace(tzinfo=timezone.utc)
        diff = (now - event_time).total_seconds()
        # Accept scans within a 30-second window
        if 0 <= diff <= 30:
            return CaptureNextResponse(
                uid=recent_event.card_uid,
                message="Scan captured.",
            )

    return CaptureNextResponse(
        uid=None,
        message="Waiting for a physical RFID scan. Tap a card on the reader.",
    )


@router.get("/{event_id}", response_model=ScanEventResponse)
def get_scan(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single scan event by event_id."""
    event = db.query(ScanEvent).filter(ScanEvent.event_id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": f"Scan event '{event_id}' not found."}},
        )
    return ScanEventResponse.model_validate(event)
