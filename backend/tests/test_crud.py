import pytest
from app.models.user import User
from app.core.security import get_password_hash, create_access_token


def _get_auth_headers(db_session, username="test_admin", role="admin"):
    """Helper to ensure an admin user exists and return Bearer auth headers."""
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


# =====================================================================
# 1. Library CRUD
# =====================================================================

def test_create_library(client, db_session):
    """Test 1: Create library -> 201, verify fields."""
    headers = _get_auth_headers(db_session)
    payload = {
        "name": "North Branch Library",
        "code": "NBL",
        "address": "456 North Ave",
        "floors": 2,
    }
    response = client.post("/api/libraries", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "North Branch Library"
    assert data["code"] == "NBL"
    assert data["address"] == "456 North Ave"
    assert data["floors"] == 2
    assert data["areas_count"] == 0
    assert data["is_sample"] is False
    assert "id" in data
    assert "created_at" in data


def test_list_libraries_pagination(client, db_session):
    """Test 2: List libraries -> 200, pagination works."""
    headers = _get_auth_headers(db_session)
    for i in range(5):
        client.post(
            "/api/libraries",
            json={"name": f"Library {i}", "code": f"LIB{i}", "floors": 1},
            headers=headers,
        )

    response = client.get("/api/libraries?skip=1&limit=2", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 5
    assert data["skip"] == 1
    assert data["limit"] == 2
    assert len(data["items"]) == 2


def test_get_library_by_id(client, db_session):
    """Test 3: Get library by id -> 200."""
    headers = _get_auth_headers(db_session)
    create_res = client.post(
        "/api/libraries",
        json={"name": "East Branch", "code": "EBL", "floors": 3},
        headers=headers,
    )
    lib_id = create_res.json()["id"]

    response = client.get(f"/api/libraries/{lib_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == lib_id
    assert data["name"] == "East Branch"
    assert data["code"] == "EBL"

    # Nonexistent
    not_found = client.get("/api/libraries/99999", headers=headers)
    assert not_found.status_code == 404
    assert not_found.json()["error"]["code"] == "NOT_FOUND"


def test_update_library(client, db_session):
    """Test 4: Update library -> 200."""
    headers = _get_auth_headers(db_session)
    create_res = client.post(
        "/api/libraries",
        json={"name": "West Branch", "code": "WBL", "floors": 1},
        headers=headers,
    )
    lib_id = create_res.json()["id"]

    update_res = client.put(
        f"/api/libraries/{lib_id}",
        json={"name": "West Branch Renamed", "floors": 2},
        headers=headers,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["name"] == "West Branch Renamed"
    assert data["floors"] == 2
    assert data["code"] == "WBL"


def test_delete_library(client, db_session):
    """Test 5: Delete library -> 200."""
    headers = _get_auth_headers(db_session)
    create_res = client.post(
        "/api/libraries",
        json={"name": "Temp Branch", "code": "TBL", "floors": 1},
        headers=headers,
    )
    lib_id = create_res.json()["id"]

    del_res = client.delete(f"/api/libraries/{lib_id}", headers=headers)
    assert del_res.status_code == 200

    get_res = client.get(f"/api/libraries/{lib_id}", headers=headers)
    assert get_res.status_code == 404


# =====================================================================
# 2. Area CRUD
# =====================================================================

def test_create_area(client, db_session):
    """Test 6: Create area -> 201."""
    headers = _get_auth_headers(db_session)
    lib_res = client.post(
        "/api/libraries",
        json={"name": "Area Test Lib", "code": "ATL", "floors": 2},
        headers=headers,
    )
    lib_id = lib_res.json()["id"]

    payload = {
        "library_id": lib_id,
        "name": "Main Entrance",
        "area_type": "entrance",
        "floor": 0,
        "description": "Double glass doors at front entrance",
    }
    response = client.post("/api/areas", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Main Entrance"
    assert data["area_type"] == "entrance"
    assert data["floor"] == 0
    assert data["library_id"] == lib_id
    assert data["is_sample"] is False
    assert "id" in data


def test_list_areas_filter(client, db_session):
    """Test listing areas filtered by library_id."""
    headers = _get_auth_headers(db_session)
    lib1 = client.post("/api/libraries", json={"name": "L1", "code": "L1", "floors": 1}, headers=headers).json()
    lib2 = client.post("/api/libraries", json={"name": "L2", "code": "L2", "floors": 1}, headers=headers).json()

    client.post("/api/areas", json={"library_id": lib1["id"], "name": "A1", "area_type": "entrance", "floor": 0}, headers=headers)
    client.post("/api/areas", json={"library_id": lib2["id"], "name": "A2", "area_type": "reception", "floor": 0}, headers=headers)

    res = client.get(f"/api/areas?library_id={lib1['id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "A1"


# =====================================================================
# 3. RFID Card CRUD & UID Validation
# =====================================================================

def test_create_card_valid_uid(client, db_session):
    """Test 7: Create card with valid UID -> 201."""
    headers = _get_auth_headers(db_session)
    vis = client.post("/api/visitors", json={"mode": "blind", "language": "en"}, headers=headers).json()

    payload = {
        "uid": "04A1B2C3",
        "visitor_id": vis["id"],
        "label": "Card 1 - Blind Mode",
    }
    response = client.post("/api/cards", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["uid"] == "04A1B2C3"
    assert data["visitor_id"] == vis["id"]
    assert data["is_active"] is True
    assert data["is_sample"] is False


def test_create_card_duplicate_active_uid(client, db_session):
    """Test 8: Create card with duplicate active UID -> 409."""
    headers = _get_auth_headers(db_session)
    vis1 = client.post("/api/visitors", json={"mode": "blind", "language": "en"}, headers=headers).json()
    vis2 = client.post("/api/visitors", json={"mode": "hearing", "language": "en"}, headers=headers).json()

    client.post("/api/cards", json={"uid": "A1B2C3D4", "visitor_id": vis1["id"]}, headers=headers)

    dup_res = client.post("/api/cards", json={"uid": "A1B2C3D4", "visitor_id": vis2["id"]}, headers=headers)
    assert dup_res.status_code == 409
    data = dup_res.json()
    assert data["error"]["code"] == "DUPLICATE_ACTIVE_CARD"


def test_create_card_invalid_uid(client, db_session):
    """Test 9: Create card with invalid UID (lowercase, too short) -> 422."""
    headers = _get_auth_headers(db_session)
    vis = client.post("/api/visitors", json={"mode": "blind", "language": "en"}, headers=headers).json()

    # Lowercase hex
    res1 = client.post("/api/cards", json={"uid": "04a1b2c3", "visitor_id": vis["id"]}, headers=headers)
    assert res1.status_code == 422

    # Too short (< 8 chars)
    res2 = client.post("/api/cards", json={"uid": "A1B2C", "visitor_id": vis["id"]}, headers=headers)
    assert res2.status_code == 422

    # Separators
    res3 = client.post("/api/cards", json={"uid": "04:A1:B2:C3", "visitor_id": vis["id"]}, headers=headers)
    assert res3.status_code == 422

    # Non-hex characters
    res4 = client.post("/api/cards", json={"uid": "GHIJKLMNOP", "visitor_id": vis["id"]}, headers=headers)
    assert res4.status_code == 422


def test_delete_card_deactivates_not_removes(client, db_session):
    """Test 10: Delete card -> 200, is_active=False (not removed)."""
    headers = _get_auth_headers(db_session)
    vis = client.post("/api/visitors", json={"mode": "blind", "language": "en"}, headers=headers).json()
    card = client.post("/api/cards", json={"uid": "11223344", "visitor_id": vis["id"]}, headers=headers).json()
    card_id = card["id"]

    del_res = client.delete(f"/api/cards/{card_id}", headers=headers)
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["id"] == card_id
    assert del_data["is_active"] is False

    # Confirm card is still in database via GET /{id}
    get_res = client.get(f"/api/cards/{card_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["is_active"] is False

    # Once deactivated, creating a NEW active card with the same UID should succeed (no 409)
    new_card_res = client.post("/api/cards", json={"uid": "11223344", "visitor_id": vis["id"]}, headers=headers)
    assert new_card_res.status_code == 201
    assert new_card_res.json()["is_active"] is True


# =====================================================================
# 4. Instruction CRUD & Mode Filtering
# =====================================================================

def test_create_instruction(client, db_session):
    """Test 11: Create instruction -> 201."""
    headers = _get_auth_headers(db_session)
    lib = client.post("/api/libraries", json={"name": "Inst Lib", "code": "INL", "floors": 1}, headers=headers).json()
    area = client.post("/api/areas", json={"library_id": lib["id"], "name": "Entrance", "area_type": "entrance", "floor": 0}, headers=headers).json()

    payload = {
        "library_id": lib["id"],
        "area_id": area["id"],
        "mode": "blind",
        "language": "en",
        "priority": 1,
        "title": "Entrance Welcome",
        "content": "Automatic sliding doors ahead. Reception desk is 10 steps straight forward.",
    }
    response = client.post("/api/instructions", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Entrance Welcome"
    assert data["mode"] == "blind"
    assert data["language"] == "en"
    assert data["priority"] == 1
    assert data["is_sample"] is False


def test_list_instructions_filtered_by_mode(client, db_session):
    """Test 12: List instructions filtered by mode -> correct results."""
    headers = _get_auth_headers(db_session)
    lib = client.post("/api/libraries", json={"name": "Inst Filter Lib", "code": "IFL", "floors": 1}, headers=headers).json()
    area = client.post("/api/areas", json={"library_id": lib["id"], "name": "Lobby", "area_type": "reception", "floor": 0}, headers=headers).json()

    client.post(
        "/api/instructions",
        json={"library_id": lib["id"], "area_id": area["id"], "mode": "blind", "language": "en", "priority": 1, "title": "Blind Inst", "content": "Audio info"},
        headers=headers,
    )
    client.post(
        "/api/instructions",
        json={"library_id": lib["id"], "area_id": area["id"], "mode": "hearing", "language": "en", "priority": 1, "title": "Hearing Inst", "content": "Visual sign"},
        headers=headers,
    )

    res = client.get(f"/api/instructions?library_id={lib['id']}&mode=blind", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["mode"] == "blind"
    assert data["items"][0]["title"] == "Blind Inst"


# =====================================================================
# 5. Assessment CRUD & Score Calculation
# =====================================================================

def test_create_assessment(client, db_session):
    """Test 13: Create assessment -> 201."""
    headers = _get_auth_headers(db_session)
    lib = client.post("/api/libraries", json={"name": "Ass Lib", "code": "ASL", "floors": 1}, headers=headers).json()
    area = client.post("/api/areas", json={"library_id": lib["id"], "name": "Entrance", "area_type": "entrance", "floor": 0}, headers=headers).json()
    crit = client.post("/api/criteria", json={"name": "Ramp Slope", "area_type": "entrance"}, headers=headers).json()

    payload = {
        "library_id": lib["id"],
        "area_id": area["id"],
        "criterion_id": crit["id"],
        "status": "pass",
        "notes": "Slope is 1:12 with handrails.",
    }
    response = client.post("/api/assessments", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pass"
    assert data["notes"] == "Slope is 1:12 with handrails."
    assert data["library_id"] == lib["id"]
    assert data["area_id"] == area["id"]
    assert data["criterion_id"] == crit["id"]


def test_assessment_score_calculation(client, db_session):
    """Test 14: Get score -> correct calculation, correct label."""
    headers = _get_auth_headers(db_session)
    lib = client.post("/api/libraries", json={"name": "Score Lib", "code": "SCL", "floors": 1}, headers=headers).json()
    area = client.post("/api/areas", json={"library_id": lib["id"], "name": "A1", "area_type": "entrance", "floor": 0}, headers=headers).json()

    # Create 5 criteria
    c1 = client.post("/api/criteria", json={"name": "C1"}, headers=headers).json()
    c2 = client.post("/api/criteria", json={"name": "C2"}, headers=headers).json()
    c3 = client.post("/api/criteria", json={"name": "C3"}, headers=headers).json()
    c4 = client.post("/api/criteria", json={"name": "C4"}, headers=headers).json()
    c5 = client.post("/api/criteria", json={"name": "C5"}, headers=headers).json()
    c6 = client.post("/api/criteria", json={"name": "C6"}, headers=headers).json()
    c7 = client.post("/api/criteria", json={"name": "C7"}, headers=headers).json()

    # Seed assessments:
    # 3 pass, 1 needs_improvement, 1 fail, 2 not_assessed
    client.post("/api/assessments", json={"library_id": lib["id"], "area_id": area["id"], "criterion_id": c1["id"], "status": "pass"}, headers=headers)
    client.post("/api/assessments", json={"library_id": lib["id"], "area_id": area["id"], "criterion_id": c2["id"], "status": "pass"}, headers=headers)
    client.post("/api/assessments", json={"library_id": lib["id"], "area_id": area["id"], "criterion_id": c3["id"], "status": "pass"}, headers=headers)
    client.post("/api/assessments", json={"library_id": lib["id"], "area_id": area["id"], "criterion_id": c4["id"], "status": "needs_improvement"}, headers=headers)
    client.post("/api/assessments", json={"library_id": lib["id"], "area_id": area["id"], "criterion_id": c5["id"], "status": "fail"}, headers=headers)
    client.post("/api/assessments", json={"library_id": lib["id"], "area_id": area["id"], "criterion_id": c6["id"], "status": "not_assessed"}, headers=headers)
    client.post("/api/assessments", json={"library_id": lib["id"], "area_id": area["id"], "criterion_id": c7["id"], "status": "not_assessed"}, headers=headers)

    score_res = client.get(f"/api/assessments/score?library_id={lib['id']}", headers=headers)
    assert score_res.status_code == 200
    data = score_res.json()

    # Pass / (Pass + Needs_Improvement + Fail) = 3 / (3 + 1 + 1) = 3 / 5 = 60.0%
    assert data["library_id"] == lib["id"]
    assert data["score"] == 60.0
    assert data["total_assessed"] == 5
    assert data["label"] == "Internal assessment indicator, not a certified accessibility rating."
    assert data["breakdown"] == {
        "pass": 3,
        "needs_improvement": 1,
        "fail": 1,
        "not_assessed": 2,
    }


def test_assessment_score_all_not_assessed(client, db_session):
    """Test 15: Score with all not_assessed -> score=null."""
    headers = _get_auth_headers(db_session)
    lib = client.post("/api/libraries", json={"name": "Zero Lib", "code": "ZRL", "floors": 1}, headers=headers).json()
    area = client.post("/api/areas", json={"library_id": lib["id"], "name": "A1", "area_type": "entrance", "floor": 0}, headers=headers).json()
    c1 = client.post("/api/criteria", json={"name": "Crit X"}, headers=headers).json()

    client.post("/api/assessments", json={"library_id": lib["id"], "area_id": area["id"], "criterion_id": c1["id"], "status": "not_assessed"}, headers=headers)

    score_res = client.get(f"/api/assessments/score?library_id={lib['id']}", headers=headers)
    assert score_res.status_code == 200
    data = score_res.json()
    assert data["score"] is None
    assert data["total_assessed"] == 0
    assert data["breakdown"]["not_assessed"] == 1
    assert data["label"] == "Internal assessment indicator, not a certified accessibility rating."


# =====================================================================
# 6. Auth Requirement for All Endpoints
# =====================================================================

def test_endpoints_require_auth(client):
    """Test 16: All endpoints require auth -> 401/403 without token."""
    endpoints = [
        ("get", "/api/libraries"),
        ("post", "/api/libraries"),
        ("get", "/api/areas"),
        ("post", "/api/areas"),
        ("get", "/api/cards"),
        ("post", "/api/cards"),
        ("get", "/api/instructions"),
        ("post", "/api/instructions"),
        ("get", "/api/criteria"),
        ("post", "/api/criteria"),
        ("get", "/api/assessments"),
        ("get", "/api/assessments/score?library_id=1"),
        ("post", "/api/assessments"),
        ("get", "/api/settings"),
        ("post", "/api/settings"),
        ("get", "/api/visitors"),
        ("post", "/api/visitors"),
    ]

    for method, path in endpoints:
        if method == "get":
            res = client.get(path)
        else:
            res = client.post(path, json={})
        assert res.status_code in (401, 403), f"Endpoint {method.upper()} {path} allowed unauthenticated access (status: {res.status_code})"


# =====================================================================
# 7. Settings and Criteria Full CRUD Tests
# =====================================================================

def test_settings_crud(client, db_session):
    """Test Settings CRUD operations."""
    headers = _get_auth_headers(db_session)

    # Create setting
    create_res = client.post("/api/settings", json={"key": "system_name", "value": "ACCESS-EASE", "description": "Platform title"}, headers=headers)
    assert create_res.status_code == 201
    assert create_res.json()["key"] == "system_name"

    # Duplicate key
    dup_res = client.post("/api/settings", json={"key": "system_name", "value": "Duplicate"}, headers=headers)
    assert dup_res.status_code == 409

    # Get by key
    get_res = client.get("/api/settings/system_name", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["value"] == "ACCESS-EASE"

    # Update by key
    up_res = client.put("/api/settings/system_name", json={"value": "AccessSync Updated"}, headers=headers)
    assert up_res.status_code == 200
    assert up_res.json()["value"] == "AccessSync Updated"


def test_criteria_crud(client, db_session):
    """Test Criteria CRUD operations."""
    headers = _get_auth_headers(db_session)

    # Create criterion
    create_res = client.post("/api/criteria", json={"name": "Audio Guidance Clarity", "area_type": "entrance"}, headers=headers)
    assert create_res.status_code == 201
    crit_id = create_res.json()["id"]

    # Update
    up_res = client.put(f"/api/criteria/{crit_id}", json={"name": "Audio Guidance High Quality"}, headers=headers)
    assert up_res.status_code == 200
    assert up_res.json()["name"] == "Audio Guidance High Quality"

    # Delete
    del_res = client.delete(f"/api/criteria/{crit_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify deleted
    get_res = client.get(f"/api/criteria/{crit_id}", headers=headers)
    assert get_res.status_code == 404
