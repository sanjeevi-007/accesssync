import uuid
from datetime import datetime, timezone, timedelta
import pytest
from app.models.user import User
from app.models.device import Device
from app.models.library import Library
from app.models.area import Area
from app.models.visitor import Visitor
from app.models.rfid_card import RfidCard
from app.models.instruction import Instruction
from app.models.scan_event import ScanEvent
from app.core.security import get_password_hash, create_access_token


def _get_auth_headers(db_session, username="admin_scans", role="admin"):
    """Helper to get JWT Bearer headers for admin."""
    user = db_session.query(User).filter(User.username == username).first()
    if not user:
        user = User(
            username=username,
            password_hash=get_password_hash("AdminPass123!"),
            role=role,
            is_active=True,
            must_change_password=False,
            is_sample=False,
        )
        db_session.add(user)
        db_session.commit()
    token = create_access_token({"sub": username, "role": role})
    return {"Authorization": f"Bearer {token}"}


def _setup_scan_fixture(db_session, device_token="test-token-123"):
    """Helper to set up a library, entrance area, authenticated device, visitor, card, and instructions."""
    lib = Library(name="Scan Test Library", code="STL", floors=2, is_sample=False)
    db_session.add(lib)
    db_session.commit()

    area = Area(library_id=lib.id, name="Main Entrance", area_type="entrance", floor=0, is_sample=False)
    db_session.add(area)
    db_session.commit()

    device = Device(
        device_id="reader-test-01",
        token_hash=get_password_hash(device_token),
        location="Main Entrance Reader",
        entrance_area_id=area.id,
        is_active=True,
        is_sample=False,
    )
    db_session.add(device)
    db_session.commit()

    visitor = Visitor(mode="blind", language="en", is_sample=False)
    db_session.add(visitor)
    db_session.commit()

    card = RfidCard(
        uid="04A1B2C3",
        visitor_id=visitor.id,
        label="Blind Visitor Card",
        is_active=True,
        is_sample=False,
    )
    db_session.add(card)
    db_session.commit()

    inst1 = Instruction(
        library_id=lib.id,
        area_id=area.id,
        mode="blind",
        language="en",
        priority=1,
        title="Welcome Blind Visitor",
        content="Automatic sliding doors ahead. Reception is straight forward.",
        is_active=True,
        is_sample=False,
    )
    inst2 = Instruction(
        library_id=lib.id,
        area_id=area.id,
        mode="blind",
        language="en",
        priority=2,
        title="Tactile Paving",
        content="Follow the ribbed paving on the floor directly to the service counter.",
        is_active=True,
        is_sample=False,
    )
    db_session.add_all([inst1, inst2])
    db_session.commit()

    return {
        "library": lib,
        "area": area,
        "device": device,
        "device_token": device_token,
        "visitor": visitor,
        "card": card,
        "instructions": [inst1, inst2],
    }


def test_scan_accepted(client, db_session):
    """Test 1: valid event_id + registered active UID -> 200, result='accepted', instructions present."""
    data_env = _setup_scan_fixture(db_session)
    event_id = str(uuid.uuid4())

    response = client.post(
        "/api/rfid/scans",
        json={"event_id": event_id, "uid": "04A1B2C3"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == "accepted"
    assert data["reason"] is None
    assert data["mode"] == "blind"
    assert data["duplicate"] is False
    assert len(data["instructions"]) == 2
    assert data["instructions"][0]["title"] == "Welcome Blind Visitor"
    assert data["instructions"][1]["title"] == "Tactile Paving"


def test_scan_rejected_unregistered(client, db_session):
    """Test 2: unknown UID -> 200, result='rejected', reason='UNREGISTERED', no private data."""
    data_env = _setup_scan_fixture(db_session)
    event_id = str(uuid.uuid4())

    response = client.post(
        "/api/rfid/scans",
        json={"event_id": event_id, "uid": "DEADBEEF01"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == "rejected"
    assert data["reason"] == "UNREGISTERED"

    # Verify no private data is exposed
    assert data.get("mode") is None
    assert data.get("instructions") is None
    assert "visitor_id" not in data
    assert "visitor" not in data

    # Verify stored in scan_events
    stored = db_session.query(ScanEvent).filter(ScanEvent.event_id == event_id).first()
    assert stored is not None
    assert stored.result == "rejected"
    assert stored.reason == "UNREGISTERED"


def test_scan_rejected_inactive(client, db_session):
    """Test 3: deactivated card -> 200, result='rejected', reason='INACTIVE'."""
    data_env = _setup_scan_fixture(db_session)
    card = data_env["card"]
    card.is_active = False
    db_session.commit()

    event_id = str(uuid.uuid4())
    response = client.post(
        "/api/rfid/scans",
        json={"event_id": event_id, "uid": card.uid},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == "rejected"
    assert data["reason"] == "INACTIVE"
    assert data.get("mode") is None
    assert data.get("instructions") is None


def test_scan_idempotency(client, db_session):
    """Test 4: same event_id twice -> second returns duplicate=true, same result, no new DB row."""
    data_env = _setup_scan_fixture(db_session)
    event_id = "test-idem-uuid-1234"

    # First scan
    res1 = client.post(
        "/api/rfid/scans",
        json={"event_id": event_id, "uid": "04A1B2C3"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert res1.status_code == 200
    assert res1.json()["duplicate"] is False

    count_after_first = db_session.query(ScanEvent).filter(ScanEvent.event_id == event_id).count()
    assert count_after_first == 1

    # Second scan with identical event_id
    res2 = client.post(
        "/api/rfid/scans",
        json={"event_id": event_id, "uid": "04A1B2C3"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["duplicate"] is True
    assert data2["result"] == "accepted"
    assert len(data2["instructions"]) == 2

    # Verify no duplicate row was created in database
    count_after_second = db_session.query(ScanEvent).filter(ScanEvent.event_id == event_id).count()
    assert count_after_second == 1


def test_scan_invalid_uid(client, db_session):
    """Test 5: lowercase, too short -> 400, INVALID_UID."""
    data_env = _setup_scan_fixture(db_session)

    # Lowercase UID
    res1 = client.post(
        "/api/rfid/scans",
        json={"event_id": str(uuid.uuid4()), "uid": "04a1b2c3"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert res1.status_code == 400
    assert res1.json()["error"]["code"] == "INVALID_UID"

    # Too short (< 8 chars)
    res2 = client.post(
        "/api/rfid/scans",
        json={"event_id": str(uuid.uuid4()), "uid": "1234"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert res2.status_code == 400
    assert res2.json()["error"]["code"] == "INVALID_UID"

    # Non-hex characters
    res3 = client.post(
        "/api/rfid/scans",
        json={"event_id": str(uuid.uuid4()), "uid": "NOTAHEXUID!"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert res3.status_code == 400
    assert res3.json()["error"]["code"] == "INVALID_UID"


def test_scan_invalid_device_token(client, db_session):
    """Test 6: invalid device token -> 401."""
    _setup_scan_fixture(db_session)
    response = client.post(
        "/api/rfid/scans",
        json={"event_id": str(uuid.uuid4()), "uid": "04A1B2C3"},
        headers={"X-Device-Token": "bad-wrong-token"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_DEVICE_TOKEN"


def test_scan_missing_device_token(client):
    """Test 7: missing device token header -> 422."""
    response = client.post(
        "/api/rfid/scans",
        json={"event_id": str(uuid.uuid4()), "uid": "04A1B2C3"},
    )
    assert response.status_code == 422


def test_scan_updates_last_seen(client, db_session):
    """Test 8: verify device.last_seen_at is updated after scan."""
    data_env = _setup_scan_fixture(db_session)
    device = data_env["device"]
    assert device.last_seen_at is None

    response = client.post(
        "/api/rfid/scans",
        json={"event_id": str(uuid.uuid4()), "uid": "04A1B2C3"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert response.status_code == 200

    db_session.refresh(device)
    assert device.last_seen_at is not None


def test_scan_instruction_snapshot(client, db_session):
    """Test 9: verify snapshot contains correct instructions for the mode."""
    data_env = _setup_scan_fixture(db_session)
    event_id = str(uuid.uuid4())

    response = client.post(
        "/api/rfid/scans",
        json={"event_id": event_id, "uid": "04A1B2C3"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    assert response.status_code == 200

    stored = db_session.query(ScanEvent).filter(ScanEvent.event_id == event_id).first()
    assert stored is not None
    assert stored.instruction_snapshot is not None
    import json
    snapshot = json.loads(stored.instruction_snapshot)
    assert len(snapshot) == 2
    assert snapshot[0]["mode"] == "blind"
    assert snapshot[1]["mode"] == "blind"


def test_scan_list(client, db_session):
    """Test 10: GET /api/rfid/scans returns paginated results."""
    data_env = _setup_scan_fixture(db_session)
    headers = _get_auth_headers(db_session)

    # Perform 3 scans
    for i in range(3):
        client.post(
            "/api/rfid/scans",
            json={"event_id": f"scan-list-{i}", "uid": "04A1B2C3"},
            headers={"X-Device-Token": data_env["device_token"]},
        )

    res = client.get("/api/rfid/scans?skip=0&limit=2", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 3
    assert data["skip"] == 0
    assert data["limit"] == 2
    assert len(data["items"]) == 2


def test_scan_list_filter(client, db_session):
    """Test 11: filter by result=rejected returns only rejected."""
    data_env = _setup_scan_fixture(db_session)
    headers = _get_auth_headers(db_session)

    # 1 accepted, 1 rejected
    client.post(
        "/api/rfid/scans",
        json={"event_id": "acc-1", "uid": "04A1B2C3"},
        headers={"X-Device-Token": data_env["device_token"]},
    )
    client.post(
        "/api/rfid/scans",
        json={"event_id": "rej-1", "uid": "FFFFFFFF"},
        headers={"X-Device-Token": data_env["device_token"]},
    )

    res = client.get("/api/rfid/scans?result=rejected", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert all(item["result"] == "rejected" for item in data["items"])


def test_scan_capture_next_no_scan(client, db_session):
    """Test 12: returns uid=null with waiting message."""
    headers = _get_auth_headers(db_session)

    res = client.get("/api/rfid/scans/capture-next", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["uid"] is None
    assert data["message"] == "Waiting for a physical RFID scan. Tap a card on the reader."


def test_scan_capture_next_with_scan(client, db_session):
    """Test 13: returns uid after a recent scan."""
    data_env = _setup_scan_fixture(db_session)
    headers = _get_auth_headers(db_session)

    client.post(
        "/api/rfid/scans",
        json={"event_id": str(uuid.uuid4()), "uid": "04A1B2C3"},
        headers={"X-Device-Token": data_env["device_token"]},
    )

    res = client.get("/api/rfid/scans/capture-next", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["uid"] == "04A1B2C3"
