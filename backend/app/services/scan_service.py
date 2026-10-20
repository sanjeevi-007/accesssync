import re
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.scan_event import ScanEvent
from app.models.rfid_card import RfidCard
from app.models.instruction import Instruction
from app.models.device import Device
from app.models.area import Area
from app.models.visitor import Visitor

from app.core.websocket_manager import manager

logger = logging.getLogger(__name__)


async def broadcast_scan_event(event_data: dict):
    """Broadcast scan event to all connected WebSocket clients."""
    await manager.broadcast({"type": "scan", "data": event_data})


async def process_scan(
    db: Session,
    event_id: str,
    card_uid: str,
    device: Optional[Device],
) -> Dict[str, Any]:
    """Process an RFID scan event following the 10-step specification."""

    # 1. Device verification is handled by dependency verify_device_token.

    # 2. IDEMPOTENCY: If event_id already exists in scan_events, return stored result immediately.
    stored = db.query(ScanEvent).filter(ScanEvent.event_id == event_id).first()
    if stored:
        if stored.result == "rejected":
            return {
                "result": stored.result,
                "reason": stored.reason,
                "mode": stored.mode,
                "instructions": None,
                "duplicate": True,
            }
        instructions = json.loads(stored.instruction_snapshot) if stored.instruction_snapshot else []
        return {
            "result": stored.result,
            "reason": stored.reason,
            "mode": stored.mode,
            "instructions": instructions,
            "duplicate": True,
        }

    # 3. Validate and normalize UID:
    # Must match ^[0-9A-F]{8,20}$. If lowercase or invalid length/chars, raise 400 with code "INVALID_UID".
    if any(c.islower() for c in card_uid):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_UID", "message": "UID must be uppercase hex characters."}},
        )

    cleaned_uid = re.sub(r"[\s\:\-]", "", card_uid).strip()
    if not (8 <= len(cleaned_uid) <= 20) or not re.fullmatch(r"^[0-9A-F]{8,20}$", cleaned_uid):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_UID", "message": "UID must be 8 to 20 uppercase hex characters without separators."}},
        )

    # 4. Look up the card by normalized UID
    card = db.query(RfidCard).filter(RfidCard.uid == cleaned_uid).first()

    # 5. REJECTION LOGIC
    if not card or not card.is_active:
        reason = "UNREGISTERED" if not card else "INACTIVE"
        rejected_event = ScanEvent(
            event_id=event_id,
            card_uid=cleaned_uid,
            result="rejected",
            reason=reason,
            mode=None,
            instruction_snapshot=None,
            device_id=device.id if device else None,
            is_sample=False,
        )
        db.add(rejected_event)
        if device:
            device.last_seen_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(rejected_event)

        # Return ONLY result and reason, no private data
        return {
            "result": "rejected",
            "reason": reason,
        }

    # 6. ACCEPTED: Load visitor's mode, the library, and the device's entrance_area
    visitor = card.visitor or db.query(Visitor).filter(Visitor.id == card.visitor_id).first()
    mode = visitor.mode if visitor else None

    library_id = None
    area_id = None
    if device and device.entrance_area_id:
        area = device.entrance_area or db.query(Area).filter(Area.id == device.entrance_area_id).first()
        if area:
            area_id = area.id
            library_id = area.library_id

    # 7. Query active instructions matching library_id, area_id, mode, language="en", ordered by priority ASC
    inst_query = db.query(Instruction).filter(
        Instruction.is_active == True,
        Instruction.mode == mode,
        Instruction.language == "en",
    )
    if library_id is not None:
        inst_query = inst_query.filter(Instruction.library_id == library_id)
    if area_id is not None:
        inst_query = inst_query.filter(Instruction.area_id == area_id)

    instructions = inst_query.order_by(Instruction.priority.asc(), Instruction.id.asc()).all()
    instructions_data = [
        {
            "id": inst.id,
            "library_id": inst.library_id,
            "area_id": inst.area_id,
            "mode": inst.mode,
            "language": inst.language,
            "priority": inst.priority,
            "title": inst.title,
            "content": inst.content,
        }
        for inst in instructions
    ]
    snapshot_json = json.dumps(instructions_data)

    # 8. Store the scan_event
    accepted_event = ScanEvent(
        event_id=event_id,
        card_uid=cleaned_uid,
        result="accepted",
        reason=None,
        mode=mode,
        instruction_snapshot=snapshot_json,
        device_id=device.id if device else None,
        is_sample=False,
    )
    db.add(accepted_event)

    # 9. Update device.last_seen_at
    if device:
        device.last_seen_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(accepted_event)

    # 10. BROADCAST HOOK
    event_data = {
        "event_id": event_id,
        "card_uid": cleaned_uid,
        "result": "accepted",
        "mode": mode,
        "instructions": instructions_data,
        "device_id": device.device_id if device else None,
    }
    await broadcast_scan_event(event_data)

    return {
        "result": "accepted",
        "reason": None,
        "mode": mode,
        "instructions": instructions_data,
        "duplicate": False,
    }
