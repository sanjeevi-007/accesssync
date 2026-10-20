from app.models import (
    Library, Area, Visitor, RfidCard, Instruction,
    Criterion, Assessment, Device, User, Setting
)
from app.seed import seed


def test_seed_creates_expected_data(db_session):
    """Test seed creates all expected records."""
    seed()

    libs = db_session.query(Library).all()
    assert len(libs) == 1
    assert libs[0].name == "City Central Library"
    assert libs[0].code == "CCL"
    assert libs[0].floors == 2
    assert libs[0].is_sample is True

    areas = db_session.query(Area).all()
    assert len(areas) == 14
    assert all(a.is_sample for a in areas)

    visitors = db_session.query(Visitor).all()
    assert len(visitors) == 3
    assert all(v.is_sample for v in visitors)

    cards = db_session.query(RfidCard).all()
    assert len(cards) == 3
    assert set(c.uid for c in cards) == {"AAAAAAAA", "BBBBBBBB", "CCCCCCCC"}
    assert all(c.is_sample for c in cards)

    instructions = db_session.query(Instruction).all()
    assert len(instructions) >= 42
    assert all(i.is_sample for i in instructions)

    # Verify each area has 3 distinct instructions for the 3 modes
    for area in areas:
        area_insts = [i for i in instructions if i.area_id == area.id]
        assert len(area_insts) == 3
        modes = set(i.mode for i in area_insts)
        assert modes == {"blind", "hearing", "low_vision"}
        contents = set(i.content for i in area_insts)
        assert len(contents) == 3

    criteria = db_session.query(Criterion).all()
    assert len(criteria) == 5
    assert all(c.is_sample for c in criteria)

    assessments = db_session.query(Assessment).all()
    assert len(assessments) == 15
    assert all(a.is_sample for a in assessments)

    devices = db_session.query(Device).all()
    assert len(devices) == 1
    assert devices[0].device_id == "reader-01"
    assert devices[0].token_hash.startswith("$2b$")
    assert devices[0].is_sample is True

    users = db_session.query(User).all()
    assert len(users) == 1
    assert users[0].username == "admin"
    assert users[0].role == "admin"
    assert users[0].must_change_password is True
    assert users[0].password_hash.startswith("$2b$")
    assert users[0].is_sample is True

    settings = db_session.query(Setting).all()
    assert len(settings) == 2
    assert all(s.is_sample for s in settings)


def test_seed_idempotency(db_session):
    """Test that running seed a second time creates no duplicates."""
    # First seed run
    seed()

    # Capture counts after first seed
    lib_count_1 = db_session.query(Library).count()
    area_count_1 = db_session.query(Area).count()
    visitor_count_1 = db_session.query(Visitor).count()
    card_count_1 = db_session.query(RfidCard).count()
    inst_count_1 = db_session.query(Instruction).count()
    crit_count_1 = db_session.query(Criterion).count()
    ass_count_1 = db_session.query(Assessment).count()
    dev_count_1 = db_session.query(Device).count()
    user_count_1 = db_session.query(User).count()
    setting_count_1 = db_session.query(Setting).count()

    # Run seed again
    seed()

    # Assert counts remained identical
    assert db_session.query(Library).count() == lib_count_1
    assert db_session.query(Area).count() == area_count_1
    assert db_session.query(Visitor).count() == visitor_count_1
    assert db_session.query(RfidCard).count() == card_count_1
    assert db_session.query(Instruction).count() == inst_count_1
    assert db_session.query(Criterion).count() == crit_count_1
    assert db_session.query(Assessment).count() == ass_count_1
    assert db_session.query(Device).count() == dev_count_1
    assert db_session.query(User).count() == user_count_1
    assert db_session.query(Setting).count() == setting_count_1
