def test_health_endpoint(client):
    """Test that the health endpoint returns status ok."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.2.0"


def test_root_endpoint(client):
    """Test that the root endpoint returns basic info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "ACCESS-EASE API"
    assert "docs" in data
    assert "health" in data


def test_error_shape_on_404(client):
    """Test that 404 responses exist (FastAPI default)."""
    response = client.get("/api/nonexistent")
    assert response.status_code == 404
