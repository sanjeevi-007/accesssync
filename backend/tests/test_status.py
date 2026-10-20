from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.device import Device
from app.core.security import get_password_hash, create_access_token
from app.services.status_service import get_device_status, get_all_devices_status


def _get_auth_headers(db_session, username="admin_status", role="admin"):
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


def _create_device(db_session, device_id="device-01", token="secret-token-123", last_seen_at=None):
    """Helper to create a test device."""
    device = Device(
        device_id=device_id,
        token_hash=get_password_hash(token),
        location="Front Gate",
        last_seen_at=last_seen_at,
        is_active=True,
        is_sample=False,
    )
    db_session.add(device)
    db_session.commit()
    db_session.refresh(device)
    return device, token


def test_device_online(db_session):
    """Test 1: last_seen_at = now -> 'online'."""
    now = datetime.now(timezone.utc)
    device, _ = _create_device(db_session, device_id="dev-online", last_seen_at=now)

    status_data = get_device_status(device, timeout=45)
    assert status_data["device_id"] == "dev-online"
    assert status_data["status"] == "online"
    assert status_data["last_seen_at"] is not None


def test_device_offline(db_session):
    """Test 2: last_seen_at = 60s ago -> 'offline'."""
    sixty_secs_ago = datetime.now(timezone.utc) - timedelta(seconds=60)
    device, _ = _create_device(db_session, device_id="dev-offline", last_seen_at=sixty_secs_ago)

    status_data = get_device_status(device, timeout=45)
    assert status_data["device_id"] == "dev-offline"
    assert status_data["status"] == "offline"


def test_device_never_connected(db_session):
    """Test 3: last_seen_at = None -> 'never_connected'."""
    device, _ = _create_device(db_session, device_id="dev-never", last_seen_at=None)

    status_data = get_device_status(device, timeout=45)
    assert status_data["device_id"] == "dev-never"
    assert status_data["status"] == "never_connected"
    assert status_data["last_seen_at"] is None


def test_heartbeat_updates_last_seen(client, db_session):
    """Test 4: POST heartbeat -> last_seen_at updated and 200 returned."""
    device, token = _create_device(db_session, device_id="dev-hb", last_seen_at=None)
    assert device.last_seen_at is None

    response = client.post(
        "/api/devices/heartbeat",
        headers={"X-Device-Token": token},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["device_id"] == "dev-hb"

    db_session.refresh(device)
    assert device.last_seen_at is not None


def test_heartbeat_invalid_token(client, db_session):
    """Test 5: POST heartbeat with invalid token -> 401."""
    _create_device(db_session, device_id="dev-invalid")

    response = client.post(
        "/api/devices/heartbeat",
        headers={"X-Device-Token": "completely-wrong-token"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_DEVICE_TOKEN"


def test_get_all_status(client, db_session):
    """Test 6: GET /api/devices/status returns list with correct statuses."""
    now = datetime.now(timezone.utc)
    old = now - timedelta(seconds=120)

    _create_device(db_session, device_id="d-on", last_seen_at=now)
    _create_device(db_session, device_id="d-off", last_seen_at=old)
    _create_device(db_session, device_id="d-never", last_seen_at=None)

    headers = _get_auth_headers(db_session)
    response = client.get("/api/devices/status", headers=headers)
    assert response.status_code == 200
    items = response.json()

    status_map = {item["device_id"]: item["status"] for item in items}
    assert status_map.get("d-on") == "online"
    assert status_map.get("d-off") == "offline"
    assert status_map.get("d-never") == "never_connected"


def test_get_single_status(client, db_session):
    """Test GET /api/devices/status/{device_id}."""
    now = datetime.now(timezone.utc)
    _create_device(db_session, device_id="d-single", last_seen_at=now)

    headers = _get_auth_headers(db_session)
    response = client.get("/api/devices/status/d-single", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == "d-single"
    assert data["status"] == "online"

    # Nonexistent
    not_found = client.get("/api/devices/status/nonexistent-device", headers=headers)
    assert not_found.status_code == 404
    assert not_found.json()["error"]["code"] == "DEVICE_NOT_FOUND"
