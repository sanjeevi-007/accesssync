import uuid
import pytest
from app.models.device import Device
from app.models.library import Library
from app.models.area import Area
from app.models.visitor import Visitor
from app.models.rfid_card import RfidCard
from app.models.instruction import Instruction
from app.core.security import get_password_hash


def _setup_ws_fixture(db_session, device_token="ws-device-token"):
    """Helper to set up complete scan fixture for WebSocket testing."""
    lib = Library(name="WS Library", code="WSL", floors=1, is_sample=False)
    db_session.add(lib)
    db_session.commit()

    area = Area(library_id=lib.id, name="Lobby", area_type="entrance", floor=0, is_sample=False)
    db_session.add(area)
    db_session.commit()

    device = Device(
        device_id="ws-reader-01",
        token_hash=get_password_hash(device_token),
        location="Front Gate",
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
        label="WS Test Card",
        is_active=True,
        is_sample=False,
    )
    db_session.add(card)
    db_session.commit()

    inst = Instruction(
        library_id=lib.id,
        area_id=area.id,
        mode="blind",
        language="en",
        priority=1,
        title="Welcome Broadcast",
        content="Welcome to the library.",
        is_active=True,
        is_sample=False,
    )
    db_session.add(inst)
    db_session.commit()

    return {
        "device": device,
        "device_token": device_token,
        "card": card,
    }


def test_ws_connect_disconnect(client):
    """Test 1: connect to /ws/events, verify connection, disconnect."""
    with client.websocket_connect("/ws/events") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"


def test_ws_receives_scan_broadcast(client, db_session):
    """Test 2: connect, trigger a scan via POST /api/rfid/scans, verify WebSocket receives scan event."""
    fixture = _setup_ws_fixture(db_session)
    event_id = str(uuid.uuid4())

    with client.websocket_connect("/ws/events") as websocket:
        scan_res = client.post(
            "/api/rfid/scans",
            json={"event_id": event_id, "uid": fixture["card"].uid},
            headers={"X-Device-Token": fixture["device_token"]},
        )
        assert scan_res.status_code == 200

        msg = websocket.receive_json()
        assert msg is not None
        assert msg["type"] == "scan"
        assert msg["data"]["event_id"] == event_id
        assert msg["data"]["result"] == "accepted"
        assert msg["data"]["mode"] == "blind"


def test_ws_receives_correct_format(client, db_session):
    """Test 3: verify message has {'type': 'scan', 'data': {...}}."""
    fixture = _setup_ws_fixture(db_session)
    event_id = str(uuid.uuid4())

    with client.websocket_connect("/ws/events") as websocket:
        scan_res = client.post(
            "/api/rfid/scans",
            json={"event_id": event_id, "uid": fixture["card"].uid},
            headers={"X-Device-Token": fixture["device_token"]},
        )
        assert scan_res.status_code == 200

        msg = websocket.receive_json()
        assert "type" in msg
        assert "data" in msg
        assert msg["type"] == "scan"

        data = msg["data"]
        assert "event_id" in data
        assert "card_uid" in data
        assert "result" in data
        assert "mode" in data
        assert "instructions" in data
        assert isinstance(data["instructions"], list)
        assert len(data["instructions"]) >= 1
        assert data["instructions"][0]["title"] == "Welcome Broadcast"
