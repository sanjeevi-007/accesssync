from sqlalchemy import inspect
from app.database import engine
from app.models import (
    User, Library, Area, Visitor, RfidCard,
    ScanEvent, Instruction, Criterion, Assessment,
    Device, Setting,
    Mode, Language, AssessmentStatus, AreaType, UserRole
)


def test_enum_values():
    """Test all enum values match specification."""
    assert Mode.blind.value == "blind"
    assert Mode.hearing.value == "hearing"
    assert Mode.low_vision.value == "low_vision"

    assert Language.en.value == "en"
    assert Language.ta.value == "ta"
    assert Language.hi.value == "hi"

    assert AssessmentStatus.pass_.value == "pass"
    assert AssessmentStatus.needs_improvement.value == "needs_improvement"
    assert AssessmentStatus.fail.value == "fail"
    assert AssessmentStatus.not_assessed.value == "not_assessed"

    assert AreaType.entrance.value == "entrance"
    assert AreaType.reception.value == "reception"
    assert AreaType.shelves.value == "shelves"
    assert AreaType.reading_hall.value == "reading_hall"
    assert AreaType.computer_section.value == "computer_section"
    assert AreaType.children_section.value == "children_section"
    assert AreaType.restroom.value == "restroom"
    assert AreaType.lift.value == "lift"
    assert AreaType.stairs.value == "stairs"
    assert AreaType.corridor.value == "corridor"
    assert AreaType.exit.value == "exit"
    assert AreaType.assembly_point.value == "assembly_point"
    assert AreaType.parking.value == "parking"

    assert UserRole.admin.value == "admin"
    assert UserRole.library_manager.value == "library_manager"
    assert UserRole.accessibility_staff.value == "accessibility_staff"


def test_tables_exist_in_database():
    """Verify all 11 tables exist in the database schema."""
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    expected_tables = [
        "users",
        "libraries",
        "areas",
        "visitors",
        "rfid_cards",
        "scan_events",
        "instructions",
        "criteria",
        "assessments",
        "devices",
        "settings",
    ]

    for table in expected_tables:
        assert table in table_names, f"Table '{table}' not found in database tables: {table_names}"


def test_model_instantiation():
    """Test each model can be instantiated in memory."""
    user = User(username="testuser", password_hash="hash", role="admin", is_sample=False)
    assert user.username == "testuser"
    assert user.is_sample is False
    assert user.role == "admin"

    library = Library(name="Test Lib", code="TL", floors=1, is_sample=False)
    assert library.name == "Test Lib"
    assert library.is_sample is False

    area = Area(library_id=1, name="Entrance", area_type="entrance", floor=1, is_sample=False)
    assert area.name == "Entrance"
    assert area.is_sample is False

    visitor = Visitor(mode="blind", language="en", is_sample=False)
    assert visitor.mode == "blind"
    assert visitor.is_sample is False

    card = RfidCard(uid="12345678", visitor_id=1, label="Test Card", is_sample=False)
    assert card.uid == "12345678"
    assert card.is_sample is False

    scan = ScanEvent(event_id="evt-1", card_uid="12345678", result="accepted", is_sample=False)
    assert scan.event_id == "evt-1"
    assert scan.is_sample is False

    inst = Instruction(library_id=1, area_id=1, mode="blind", title="Title", content="Content", is_sample=False)
    assert inst.title == "Title"
    assert inst.is_sample is False

    crit = Criterion(name="Ramp", area_type="entrance", is_sample=False)
    assert crit.name == "Ramp"
    assert crit.is_sample is False

    ass = Assessment(library_id=1, area_id=1, criterion_id=1, status="pass", is_sample=False)
    assert ass.status == "pass"
    assert ass.is_sample is False

    dev = Device(device_id="dev-1", token_hash="hash", is_sample=False)
    assert dev.device_id == "dev-1"
    assert dev.is_sample is False

    setting = Setting(key="timeout", value="45", is_sample=False)
    assert setting.key == "timeout"
    assert setting.is_sample is False
