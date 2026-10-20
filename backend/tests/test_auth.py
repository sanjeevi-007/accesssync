from app.models.user import User
from app.core.security import get_password_hash


def _create_admin(db_session, username="admin", password="ChangeMe123!", role="admin", is_active=True, must_change=True):
    user = User(
        username=username,
        password_hash=get_password_hash(password),
        role=role,
        is_active=is_active,
        must_change_password=must_change,
        is_sample=True,
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_login_success(client, db_session):
    """Test login succeeds with correct credentials."""
    _create_admin(db_session)
    response = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "admin"
    assert data["must_change_password"] is True


def test_login_wrong_password(client, db_session):
    """Test login fails with incorrect password."""
    _create_admin(db_session)
    response = client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword"})
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_nonexistent(client, db_session):
    """Test login fails for nonexistent user."""
    response = client.post("/api/auth/login", json={"username": "nobody", "password": "Password123!"})
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "INVALID_CREDENTIALS"


def test_me_success(client, db_session):
    """Test /me returns profile for authenticated user."""
    _create_admin(db_session)
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    token = login_res.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert data["role"] == "admin"
    assert data["is_active"] is True
    assert data["must_change_password"] is True


def test_me_no_token(client, db_session):
    """Test /me returns 403 when Authorization header is absent (HTTPBearer default)."""
    response = client.get("/api/auth/me")
    assert response.status_code == 403


def test_me_invalid_token(client, db_session):
    """Test /me returns 401 for an invalid or forged token."""
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "INVALID_TOKEN"


def test_change_password_success(client, db_session):
    """Test password change succeeds and updates must_change_password."""
    _create_admin(db_session)
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    token = login_res.json()["access_token"]

    response = client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "ChangeMe123!", "new_password": "BrandNewPassword123!"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Password changed successfully."

    # Verify old password no longer works
    fail_res = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    assert fail_res.status_code == 401

    # Verify new password works and must_change_password is now False
    new_res = client.post("/api/auth/login", json={"username": "admin", "password": "BrandNewPassword123!"})
    assert new_res.status_code == 200
    assert new_res.json()["must_change_password"] is False


def test_change_password_wrong_current(client, db_session):
    """Test password change fails with wrong current password."""
    _create_admin(db_session)
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    token = login_res.json()["access_token"]

    response = client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "IncorrectPassword", "new_password": "BrandNewPassword123!"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "WRONG_CURRENT_PASSWORD"


def test_change_password_same(client, db_session):
    """Test password change fails when new password matches current."""
    _create_admin(db_session)
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    token = login_res.json()["access_token"]

    response = client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "ChangeMe123!", "new_password": "ChangeMe123!"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "SAME_PASSWORD"


def test_change_password_short(client, db_session):
    """Test password change fails validation when new password is < 8 characters."""
    _create_admin(db_session)
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    token = login_res.json()["access_token"]

    response = client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "ChangeMe123!", "new_password": "short"},
    )
    assert response.status_code == 422
