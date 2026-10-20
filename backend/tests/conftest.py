import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
import app.database as app_db
from app.main import app

if not Path("./database").exists() and Path("../database").exists():
    TEST_DB = "sqlite:///../database/test_accesssync.db"
else:
    TEST_DB = "sqlite:///./database/test_accesssync.db"

engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Point app_db to the test database during test runs
app_db.engine = engine
app_db.SessionLocal = TestSession


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    s = TestSession()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def client(db_session):
    def override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
