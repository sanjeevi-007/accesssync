"""
End-to-End Business Flow Integration Tests
ACCESS-EASE Accessibility Guidance Platform (Grand Plaza Mall)

Covers the full integration loop:
1. Healthcheck & system status
2. Registered card tap -> HTTP 200 -> result "accepted" with guidance instructions
3. Duplicate scan event_id tap -> HTTP 200 -> idempotent replay
4. Unknown card tap (FFFFFFFF) -> HTTP 200 -> result "rejected", reason "UNREGISTERED"
5. Inactive card tap -> HTTP 200 -> result "rejected", reason "INACTIVE"
6. Device heartbeat -> HTTP 200 -> device last_seen_at updated
7. Historical scan feed log -> returns recorded events
8. Assessment score endpoint -> accurate score calculation & breakdown
"""

import uuid
from datetime import datetime, timezone
import pytest
from app.models.user import User
from app.models.device import Device
from app.models.library import Library
from app.models.area import Area
from app.models.visitor import Visitor
from app.models.rfid_card import RfidCard
from app.models.instruction import Instruction
from app.models.criterion import Criterion
from app.models.assessment import Assessment
from app.core.security import get_password_hash, create_access_token


DEVICE_TOKEN = "dev-token-accesssync-2024"
DEVICE_HEADERS = {"X-Device-Token": DEVICE_TOKEN}


@pytest.fixture
def e2e_fixture(db_session):
    """Seed comprehensive test dataset representing Grand Plaza Mall."""
    # 1. Staff Admin User
    admin = User(
        username="mall_admin",
        password_hash=get_password_hash("AdminPass123!"),
        role="admin",
        is_active=True,
        must_change_password=False,
        is_sample=False,
    )
    db_session.add(admin)
    db_session.commit()

    # 2. Grand Plaza Mall
    mall = Library(
        name="Grand Plaza Mall",
        code="GPM",
        address="100 Mall Boulevard",
        floors=3,
        is_sample=False,
    )
    db_session.add(mall)
    db_session.commit()

    # 3. Mall Areas
    entrance_area = Area(
        library_id=mall.id,
        name="Main Entrance Kiosk",
        area_type="entrance",
        floor=0,
        is_sample=False,
    )
    food_court = Area(
        library_id=mall.id,
        name="Food Court Entrance",
        area_type="reading_hall",
        floor=1,
        is_sample=False,
    )
    elevator_hub = Area(
        library_id=mall.id,
        name="Central Elevator Bank",
        area_type="lift",
        floor=0,
        is_sample=False,
    )
    db_session.add_all([entrance_area, food_court, elevator_hub])
    db_session.commit()

    # 4. RFID Reader Device
    device = Device(
        device_id="reader-01",
        token_hash=get_password_hash(DEVICE_TOKEN),
        location="Main Entrance Kiosk Station",
        entrance_area_id=entrance_area.id,
        is_active=True,
        is_sample=False,
    )
    db_session.add(device)
    db_session.commit()

    # 5. Visitors
    v_blind = Visitor(mode="blind", language="en", is_sample=False)
    v_hearing = Visitor(mode="hearing", language="en", is_sample=False)
    v_lowvision = Visitor(mode="low_vision", language="en", is_sample=False)
    db_session.add_all([v_blind, v_hearing, v_lowvision])
    db_session.commit()

    # 6. RFID Cards
    card_blind = RfidCard(
        uid="AAAAAAAA",
        visitor_id=v_blind.id,
        label="Blind Guidance Card",
        is_active=True,
        is_sample=False,
    )
    card_hearing = RfidCard(
        uid="BBBBBBBB",
        visitor_id=v_hearing.id,
        label="Hearing Guidance Card",
        is_active=True,
        is_sample=False,
    )
    card_lowvision = RfidCard(
        uid="CCCCCCCC",
        visitor_id=v_lowvision.id,
        label="Low-Vision Guidance Card",
        is_active=True,
        is_sample=False,
    )
    card_inactive = RfidCard(
        uid="11112222",
        visitor_id=v_blind.id,
        label="Deactivated Card",
        is_active=False,
        is_sample=False,
    )
    db_session.add_all([card_blind, card_hearing, card_lowvision, card_inactive])
    db_session.commit()

    # 7. Guidance Instructions
    inst1 = Instruction(
        library_id=mall.id,
        area_id=entrance_area.id,
        mode="blind",
        language="en",
        priority=1,
        title="Main Entrance Orientation",
        content="Welcome to Grand Plaza Mall. The information desk is straight ahead 10 paces. Elevator bank is to your right.",
        is_active=True,
        is_sample=False,
    )
    inst2 = Instruction(
        library_id=mall.id,
        area_id=entrance_area.id,
        mode="blind",
        language="en",
        priority=2,
        title="Tactile Guide Strip",
        content="Follow the ribbed tactile floor strip directly to Central Elevator Bank and Food Court.",
        is_active=True,
        is_sample=False,
    )
    db_session.add_all([inst1, inst2])
    db_session.commit()

    # 8. Accessibility Criteria & Assessments (for score calculation test)
    crit1 = Criterion(name="Wheelchair ramp available", area_type=None, is_sample=False)
    crit2 = Criterion(name="Tactile paving present", area_type=None, is_sample=False)
    crit3 = Criterion(name="Adequate lighting (300+ lux)", area_type=None, is_sample=False)
    crit4 = Criterion(name="Audible announcements", area_type=None, is_sample=False)
    db_session.add_all([crit1, crit2, crit3, crit4])
    db_session.commit()

    # Assessments: 2 pass (weight 1.0), 1 needs_improvement (weight 0.5), 1 fail (weight 0.0) -> Score: (2 + 0.5) / 4 = 62.5% -> 63%
    ass1 = Assessment(library_id=mall.id, area_id=entrance_area.id, criterion_id=crit1.id, status="pass", notes="Compliant ramp", assessed_by=admin.id, is_sample=False)
    ass2 = Assessment(library_id=mall.id, area_id=entrance_area.id, criterion_id=crit2.id, status="pass", notes="Ribbed paving intact", assessed_by=admin.id, is_sample=False)
    ass3 = Assessment(library_id=mall.id, area_id=entrance_area.id, criterion_id=crit3.id, status="needs_improvement", notes="280 lux measured", assessed_by=admin.id, is_sample=False)
    ass4 = Assessment(library_id=mall.id, area_id=entrance_area.id, criterion_id=crit4.id, status="fail", notes="Muted speakers", assessed_by=admin.id, is_sample=False)
    db_session.add_all([ass1, ass2, ass3, ass4])
    db_session.commit()

    admin_token = create_access_token({"sub": admin.username, "role": admin.role})
    auth_headers = {"Authorization": f"Bearer {admin_token}"}

    return {
        "admin": admin,
        "mall": mall,
        "device": device,
        "auth_headers": auth_headers,
    }


# =============================================================================
# E2E Test Suite
# =============================================================================

def test_1_healthcheck_and_status(client, e2e_fixture):
    """Test 1: Healthcheck endpoint returns HTTP 200 and system status."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_2_registered_card_tap_accepted(client, e2e_fixture):
    """Test 2: Registered card tap (AAAAAAAA) returns HTTP 200 and 'accepted' result."""
    event_id = f"e2e-tap-{uuid.uuid4().hex[:8]}"
    payload = {"event_id": event_id, "uid": "AAAAAAAA"}

    res = client.post("/api/rfid/scans", json=payload, headers=DEVICE_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "accepted"
    assert data["mode"] == "blind"
    assert data["reason"] is None
    assert isinstance(data["instructions"], list)
    assert len(data["instructions"]) == 2
    assert "Grand Plaza Mall" in data["instructions"][0]["content"]


def test_3_duplicate_scan_idempotency(client, e2e_fixture):
    """Test 3: Duplicate scan event_id tap returns HTTP 200 with duplicate flag (idempotent skip)."""
    event_id = f"e2e-idempotent-{uuid.uuid4().hex[:8]}"
    payload = {"event_id": event_id, "uid": "AAAAAAAA"}

    # First tap
    res1 = client.post("/api/rfid/scans", json=payload, headers=DEVICE_HEADERS)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["result"] == "accepted"

    # Second tap with identical event_id
    res2 = client.post("/api/rfid/scans", json=payload, headers=DEVICE_HEADERS)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["result"] == "accepted"
    assert data2.get("duplicate") is True


def test_4_unknown_card_rejected_unregistered(client, e2e_fixture):
    """Test 4: Unknown card tap (FFFFFFFF) returns HTTP 200 with result 'rejected' and reason 'UNREGISTERED'."""
    event_id = f"e2e-unknown-{uuid.uuid4().hex[:8]}"
    payload = {"event_id": event_id, "uid": "FFFFFFFF"}

    res = client.post("/api/rfid/scans", json=payload, headers=DEVICE_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "rejected"
    assert data["reason"] == "UNREGISTERED"


def test_5_inactive_card_rejected_inactive(client, e2e_fixture):
    """Test 5: Inactive card tap (11112222) returns HTTP 200 with result 'rejected' and reason 'INACTIVE'."""
    event_id = f"e2e-inactive-{uuid.uuid4().hex[:8]}"
    payload = {"event_id": event_id, "uid": "11112222"}

    res = client.post("/api/rfid/scans", json=payload, headers=DEVICE_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "rejected"
    assert data["reason"] == "INACTIVE"


def test_6_device_heartbeat_updates_status(client, e2e_fixture, db_session):
    """Test 6: Device heartbeat returns HTTP 200 and updates last_seen_at timestamp."""
    device = e2e_fixture["device"]
    assert device.last_seen_at is None

    res = client.post("/api/devices/heartbeat", headers=DEVICE_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["device_id"] == "reader-01"

    # Verify DB update
    db_session.refresh(device)
    assert device.last_seen_at is not None


def test_7_scan_feed_log_returns_records(client, e2e_fixture):
    """Test 7: Scan log endpoint returns all recorded scan events for staff monitoring."""
    # Transmit a scan first
    client.post(
        "/api/rfid/scans",
        json={"event_id": f"e2e-log-{uuid.uuid4().hex[:8]}", "uid": "AAAAAAAA"},
        headers=DEVICE_HEADERS,
    )

    auth_headers = e2e_fixture["auth_headers"]
    res = client.get("/api/rfid/scans?limit=10", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
    assert any(item["card_uid"] == "AAAAAAAA" for item in data["items"])


def test_8_accessibility_score_endpoint(client, e2e_fixture):
    """Test 8: Library accessibility score endpoint accurately calculates compliance percentage."""
    mall = e2e_fixture["mall"]
    auth_headers = e2e_fixture["auth_headers"]

    res = client.get(f"/api/assessments/score?library_id={mall.id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["library_id"] == mall.id
    # pass_count = 2, total_assessed = 4 -> (2 / 4) * 100.0 = 50.0%
    assert data["score"] == 50.0
    assert data["total_assessed"] == 4
    assert data["breakdown"]["pass"] == 2
    assert data["breakdown"]["needs_improvement"] == 1
    assert data["breakdown"]["fail"] == 1
    assert data["breakdown"]["not_assessed"] == 0
    assert "Internal assessment indicator" in data["label"]
