from fastapi import APIRouter, Depends
from app.main import app
from app.core.permissions import verify_device_token, require_role
from app.core.security import get_password_hash, create_access_token
from app.models.device import Device
from app.models.user import User

# Test endpoints to exercise permissions dependencies
perm_test_router = APIRouter(prefix="/api/test-perm", tags=["test-permissions"])


@perm_test_router.get("/device")
async def handle_device_endpoint(device: Device = Depends(verify_device_token)):
    return {"status": "ok", "device_id": device.device_id}


@perm_test_router.get("/admin-only")
async def handle_admin_endpoint(user: User = Depends(require_role("admin"))):
    return {"status": "ok", "username": user.username}


app.include_router(perm_test_router)


def test_device_token_valid(client, db_session):
    """Test verify_device_token succeeds with correct X-Device-Token header."""
    device = Device(
        device_id="reader-01",
        token_hash=get_password_hash("dev-token-accesssync-2024"),
        is_active=True,
        is_sample=True,
    )
    db_session.add(device)
    db_session.commit()

    response = client.get("/api/test-perm/device", headers={"X-Device-Token": "dev-token-accesssync-2024"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["device_id"] == "reader-01"


def test_device_token_invalid(client, db_session):
    """Test verify_device_token fails with incorrect or inactive X-Device-Token."""
    device = Device(
        device_id="reader-01",
        token_hash=get_password_hash("dev-token-accesssync-2024"),
        is_active=True,
        is_sample=True,
    )
    db_session.add(device)
    db_session.commit()

    response = client.get("/api/test-perm/device", headers={"X-Device-Token": "wrong-token"})
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "INVALID_DEVICE_TOKEN"


def test_require_role_allowed(client, db_session):
    """Test require_role allows user with matching role."""
    user = User(
        username="admin_user",
        password_hash=get_password_hash("Password123!"),
        role="admin",
        is_active=True,
        must_change_password=False,
        is_sample=True,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token({"sub": "admin_user", "role": "admin"})
    response = client.get("/api/test-perm/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["username"] == "admin_user"


def test_require_role_denied(client, db_session):
    """Test require_role denies user without required role (403)."""
    user = User(
        username="manager_user",
        password_hash=get_password_hash("Password123!"),
        role="library_manager",
        is_active=True,
        must_change_password=False,
        is_sample=True,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token({"sub": "manager_user", "role": "library_manager"})
    response = client.get("/api/test-perm/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "INSUFFICIENT_ROLE"
