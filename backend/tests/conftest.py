import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure DATABASE_URL points to the real database directory if run from backend/
if not Path("./database").exists() and Path("../database").exists():
    os.environ.setdefault("DATABASE_URL", "sqlite:///../database/accesssync.db")

from app.main import app
from app.database import SessionLocal


@pytest.fixture
def client():
    """Provides a TestClient for the FastAPI application."""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Provides a database session for testing."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
