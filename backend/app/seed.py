import os
from pathlib import Path

# Ensure DATABASE_URL points to the real database directory if run from backend/
if not Path("./database").exists() and Path("../database").exists():
    os.environ.setdefault("DATABASE_URL", "sqlite:///../database/accesssync.db")

import bcrypt

# Ensure passlib compatibility with bcrypt >= 4.1.0
if not hasattr(bcrypt, "__about__"):
    class About:
        __version__ = bcrypt.__version__
    bcrypt.__about__ = About()

_orig_hashpw = bcrypt.hashpw
def _safe_hashpw(password, salt):
    if isinstance(password, str):
        password = password.encode("utf-8")
    if len(password) > 72:
        password = password[:72]
    return _orig_hashpw(password, salt)
bcrypt.hashpw = _safe_hashpw

from passlib.context import CryptContext
from app.database import SessionLocal
from app.models import (
    Library, Area, Visitor, RfidCard, Instruction,
    Criterion, Assessment, Device, User, Setting,
    Mode, Language, AssessmentStatus, AreaType, UserRole
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_secret(secret: str) -> str:
    return pwd_context.hash(secret)


def seed():
    db = SessionLocal()
    try:
        # 1. Admin User
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                password_hash=hash_secret("ChangeMe123!"),
                role=UserRole.admin.value,
                must_change_password=True,
                is_active=True,
                is_sample=True,
            )
            db.add(admin_user)
            db.flush()

        # 2. Library
        library = db.query(Library).filter(Library.code == "CCL").first()
        if not library:
            library = Library(
                name="City Central Library",
                code="CCL",
                floors=2,
                address="123 Main Street",
                is_sample=True,
            )
            db.add(library)
            db.flush()

        # 3. Areas (14 total: 8 Ground Floor, 5 First Floor, 1 Assembly Point)
        areas_data = [
            # Ground floor (floor=1)
            ("Main Entrance", AreaType.entrance.value, 1, "Main public entrance with automatic glass doors"),
            ("Reception Desk", AreaType.reception.value, 1, "Central information and registration desk"),
            ("Reading Hall", AreaType.reading_hall.value, 1, "General reading room with study tables"),
            ("Computer Section", AreaType.computer_section.value, 1, "Public computers and accessible digital terminals"),
            ("Accessible Restroom", AreaType.restroom.value, 1, "Unisex wheelchair-accessible restroom"),
            ("Lift L1", AreaType.lift.value, 1, "Passenger elevator connecting floors 1 and 2"),
            ("Stairs S1", AreaType.stairs.value, 1, "Main public staircase to first floor"),
            ("Emergency Exit E2", AreaType.exit.value, 1, "Ground floor rear emergency exit"),
            # First floor (floor=2)
            ("Children's Section", AreaType.children_section.value, 2, "Children's books and storytelling area"),
            ("Periodicals Area", AreaType.shelves.value, 2, "Magazines, journals, and newspaper racks"),
            ("Lift Lobby", AreaType.corridor.value, 2, "Upper floor elevator lobby and connecting corridor"),
            ("Stairs S1 (First Floor)", AreaType.stairs.value, 2, "Upper landing of main public staircase"),
            ("Emergency Exit E3", AreaType.exit.value, 2, "First floor emergency fire escape exit"),
            # Assembly point (floor=0)
            ("Front Lawn", AreaType.assembly_point.value, 0, "Outdoor designated emergency assembly point"),
        ]

        areas_map = {}
        for name, area_type, floor, desc in areas_data:
            area = db.query(Area).filter(Area.library_id == library.id, Area.name == name).first()
            if not area:
                area = Area(
                    library_id=library.id,
                    name=name,
                    area_type=area_type,
                    floor=floor,
                    description=desc,
                    is_sample=True,
                )
                db.add(area)
                db.flush()
            areas_map[name] = area

        # 4. Device
        device = db.query(Device).filter(Device.device_id == "reader-01").first()
        if not device:
            main_entrance = areas_map["Main Entrance"]
            device = Device(
                device_id="reader-01",
                token_hash=hash_secret("dev-token-accesssync-2024"),
                location="Main Entrance",
                entrance_area_id=main_entrance.id,
                is_active=True,
                is_sample=True,
            )
            db.add(device)
            db.flush()

        # 5. Visitors and RFID Cards (3 modes)
        visitor_card_data = [
            (Mode.blind.value, "AAAAAAAA", "REPLACE WITH REAL UID"),
            (Mode.hearing.value, "BBBBBBBB", "REPLACE WITH REAL UID"),
            (Mode.low_vision.value, "CCCCCCCC", "REPLACE WITH REAL UID"),
        ]

        for mode_val, uid_val, label_val in visitor_card_data:
            card = db.query(RfidCard).filter(RfidCard.uid == uid_val).first()
            if not card:
                visitor = Visitor(
                    mode=mode_val,
                    language=Language.en.value,
                    is_sample=True,
                )
                db.add(visitor)
                db.flush()

                card = RfidCard(
                    uid=uid_val,
                    visitor_id=visitor.id,
                    label=label_val,
                    is_active=True,
                    is_sample=True,
                )
                db.add(card)
                db.flush()

        # 6. Instructions (14 areas × 3 modes = 42 instructions)
        # Genuinely different guidance per mode for every area
        instructions_content = {
            "Main Entrance": {
                Mode.blind.value: "Main Entrance. Glass doors directly ahead. Tactile floor strip guides you to reception 10 meters forward.",
                Mode.hearing.value: "Main Entrance. Welcome to City Central Library. Proceed through glass doors to Reception Desk. Staff available to assist.",
                Mode.low_vision.value: "Main Entrance. Large glass doors ahead. Follow yellow floor strip to Reception (10m). Good lighting throughout.",
            },
            "Reception Desk": {
                Mode.blind.value: "Reception Desk. Counter is 1.5 meters ahead. Desk bell available on your right to alert staff for assistance.",
                Mode.hearing.value: "Reception Desk. Library staff ready to assist. Written inquiry pads and visual floor maps available at counter.",
                Mode.low_vision.value: "Reception Desk. High-contrast white counter directly ahead. Large print directory leaflets on front stand.",
            },
            "Reading Hall": {
                Mode.blind.value: "Reading Hall. Open room with wide aisles. Braille book section begins at the second aisle to your right.",
                Mode.hearing.value: "Reading Hall. Quiet study area with individual carrels and visual study occupancy indicators.",
                Mode.low_vision.value: "Reading Hall. Study tables with adjustable overhead task lamps and high-contrast signage.",
            },
            "Computer Section": {
                Mode.blind.value: "Computer Section. Accessible workstations 1 and 2 are equipped with screen readers and refreshable Braille displays.",
                Mode.hearing.value: "Computer Section. Public terminals available with visual notifications and closed captioning enabled.",
                Mode.low_vision.value: "Computer Section. Workstations equipped with 27-inch monitors, high-contrast keyboards, and screen magnification.",
            },
            "Accessible Restroom": {
                Mode.blind.value: "Accessible Restroom. Automatic door on your left with raised Braille indicator. Emergency pull cord to the right of the toilet.",
                Mode.hearing.value: "Accessible Restroom. Unlocked single-occupancy restroom with visual strobe indicator linked to facility announcements.",
                Mode.low_vision.value: "Accessible Restroom. Door marked with high-contrast icon. Well-lit interior with grab bars.",
            },
            "Lift L1": {
                Mode.blind.value: "Lift L1. Call button with raised tactile arrow and Braille. Audible chimes indicate floor arrival (single chime for up, double for down).",
                Mode.hearing.value: "Lift L1. Elevator with digital screen showing current floor number and direction of travel.",
                Mode.low_vision.value: "Lift L1. Elevator door with yellow edge markings. Large illuminated button panel inside.",
            },
            "Stairs S1": {
                Mode.blind.value: "Stairs S1. Ascending flight of 18 steps to First Floor. Continuous handrail on both sides and tactile warning pavers at top and bottom.",
                Mode.hearing.value: "Stairs S1. Stairwell leading to First Floor children's and periodicals sections.",
                Mode.low_vision.value: "Stairs S1. Staircase with high-contrast yellow non-slip nosing on each tread and brightly lit landings.",
            },
            "Emergency Exit E2": {
                Mode.blind.value: "Emergency Exit E2. Push-bar door opens outward to the rear courtyard. Tactile directional path leads directly to exit.",
                Mode.hearing.value: "Emergency Exit E2. Emergency egress door clearly marked with illuminated running-person exit sign.",
                Mode.low_vision.value: "Emergency Exit E2. High-visibility green emergency exit door with glow-in-the-dark push bar.",
            },
            "Children's Section": {
                Mode.blind.value: "Children's Section. Low display tables. Tactile picture books and audio storytelling stations along the left wall.",
                Mode.hearing.value: "Children's Section. Visual storyboards, graphic novels, and silent reading nook with clear line-of-sight.",
                Mode.low_vision.value: "Children's Section. Large print children's books and brightly colored low shelving units.",
            },
            "Periodicals Area": {
                Mode.blind.value: "Periodicals Area. Newspaper reading rack. Audio news reader tablet available at central table.",
                Mode.hearing.value: "Periodicals Area. Daily newspapers and periodicals arranged alphabetically on open display shelves.",
                Mode.low_vision.value: "Periodicals Area. Periodicals rack with large-type header labels and desktop electronic video magnifiers.",
            },
            "Lift Lobby": {
                Mode.blind.value: "Lift Lobby, First Floor. Tactile guide strip leads from elevator to main corridor and children's section.",
                Mode.hearing.value: "Lift Lobby, First Floor. Directional overhead signage to Children's Section (left) and Periodicals (right).",
                Mode.low_vision.value: "Lift Lobby, First Floor. Wide corridor with matte non-glare flooring and color-coded overhead wayfinding.",
            },
            "Stairs S1 (First Floor)": {
                Mode.blind.value: "Stairs S1, First Floor. Descending flight of stairs to Ground Floor. Handrails and tactile warning studs present.",
                Mode.hearing.value: "Stairs S1, First Floor. Stairwell exit to Ground Floor reading hall and main lobby.",
                Mode.low_vision.value: "Stairs S1, First Floor. Well-lit staircase descending to Ground Floor with contrasting step edges.",
            },
            "Emergency Exit E3": {
                Mode.blind.value: "Emergency Exit E3. External metal fire escape door with tactile push bar. Alarm sounds upon opening.",
                Mode.hearing.value: "Emergency Exit E3. Emergency exit door leading to external fire escape with illuminated visual signage.",
                Mode.low_vision.value: "Emergency Exit E3. Emergency exit marked with bright green illuminated signage and contrasting door frame.",
            },
            "Front Lawn": {
                Mode.blind.value: "Front Lawn. Designated emergency assembly point. Paved perimeter walkway with grass center, 25 meters from entrance.",
                Mode.hearing.value: "Front Lawn. Emergency assembly point marked with high-visibility outdoor green assembly sign.",
                Mode.low_vision.value: "Front Lawn. Primary assembly point with clear wide paved access path from main library doors.",
            },
        }

        for area_name, mode_dict in instructions_content.items():
            area_obj = areas_map[area_name]
            for mode_val, content_text in mode_dict.items():
                existing_inst = db.query(Instruction).filter(
                    Instruction.library_id == library.id,
                    Instruction.area_id == area_obj.id,
                    Instruction.mode == mode_val,
                    Instruction.language == Language.en.value,
                ).first()
                if not existing_inst:
                    inst = Instruction(
                        library_id=library.id,
                        area_id=area_obj.id,
                        mode=mode_val,
                        language=Language.en.value,
                        priority=0,
                        title=f"{area_name} - {mode_val.replace('_', ' ').title()}",
                        content=content_text,
                        is_active=True,
                        is_sample=True,
                    )
                    db.add(inst)
        db.flush()

        # 7. Criteria (5)
        criteria_data = [
            ("Wheelchair ramp available", "Wheelchair accessible ramp with slope <= 1:12 and double handrails", AreaType.entrance.value),
            ("Braille signage present", "Braille and raised tactile lettering adjacent to doorways at 1200-1600mm height", None),
            ("Adequate lighting (300+ lux)", "Even, glare-free illumination throughout area measuring at least 300 lux", None),
            ("Audible announcements", "Public address system with clear auditory notifications for events and emergencies", None),
            ("Accessible restroom on same floor", "Dedicated wheelchair accessible stall on the same floor level", AreaType.restroom.value),
        ]

        criteria_list = []
        for name, desc, area_type_val in criteria_data:
            crit = db.query(Criterion).filter(Criterion.name == name).first()
            if not crit:
                crit = Criterion(
                    name=name,
                    description=desc,
                    area_type=area_type_val,
                    is_sample=True,
                )
                db.add(crit)
                db.flush()
            criteria_list.append(crit)

        # 8. Assessments (First 3 areas × 5 criteria = 15 assessments)
        assessment_plan = [
            # Main Entrance
            ("Main Entrance", [
                ("Wheelchair ramp available", AssessmentStatus.pass_.value, "Ramp conforms to standards with non-slip surface."),
                ("Braille signage present", AssessmentStatus.needs_improvement.value, "Braille label is slightly faded on main entrance glass."),
                ("Adequate lighting (300+ lux)", AssessmentStatus.pass_.value, "350 lux measured at entryway floor."),
                ("Audible announcements", AssessmentStatus.not_assessed.value, "Exterior speaker system not yet evaluated."),
                ("Accessible restroom on same floor", AssessmentStatus.pass_.value, "Located 15 meters from entrance."),
            ]),
            # Reception Desk
            ("Reception Desk", [
                ("Wheelchair ramp available", AssessmentStatus.pass_.value, "Direct level access from entrance."),
                ("Braille signage present", AssessmentStatus.pass_.value, "Tactile map and Braille card reader plaque present."),
                ("Adequate lighting (300+ lux)", AssessmentStatus.pass_.value, "400 lux measured at desk level."),
                ("Audible announcements", AssessmentStatus.needs_improvement.value, "Reception microphone volume is inconsistent."),
                ("Accessible restroom on same floor", AssessmentStatus.pass_.value, "Same floor, level corridor access."),
            ]),
            # Reading Hall
            ("Reading Hall", [
                ("Wheelchair ramp available", AssessmentStatus.pass_.value, "Level entryway with 950mm wide double doors."),
                ("Braille signage present", AssessmentStatus.fail.value, "No Braille end-caps on book stacks."),
                ("Adequate lighting (300+ lux)", AssessmentStatus.needs_improvement.value, "Perimeter tables measure 250 lux, central tables 320 lux."),
                ("Audible announcements", AssessmentStatus.not_assessed.value, "Muted in reading hall to maintain quiet study environment."),
                ("Accessible restroom on same floor", AssessmentStatus.pass_.value, "Restroom located within 25m along primary corridor."),
            ]),
        ]

        for area_name, eval_list in assessment_plan:
            area_obj = areas_map[area_name]
            for crit_name, status_val, notes_text in eval_list:
                crit_obj = next(c for c in criteria_list if c.name == crit_name)
                existing_ass = db.query(Assessment).filter(
                    Assessment.library_id == library.id,
                    Assessment.area_id == area_obj.id,
                    Assessment.criterion_id == crit_obj.id,
                ).first()
                if not existing_ass:
                    ass = Assessment(
                        library_id=library.id,
                        area_id=area_obj.id,
                        criterion_id=crit_obj.id,
                        status=status_val,
                        notes=notes_text,
                        assessed_by=admin_user.id,
                        is_sample=True,
                    )
                    db.add(ass)
        db.flush()

        # 9. Settings (2)
        settings_data = [
            ("ws_heartbeat_timeout", "45", "WebSocket heartbeat timeout in seconds"),
            ("visitor_idle_timeout", "60", "Visitor screen idle reset timeout in seconds"),
        ]

        for k, v, d in settings_data:
            setting = db.query(Setting).filter(Setting.key == k).first()
            if not setting:
                setting = Setting(
                    key=k,
                    value=v,
                    description=d,
                    is_sample=True,
                )
                db.add(setting)

        db.commit()

        # SECRETS HANDLING — CRITICAL: Print once to terminal, do NOT write to file.
        print("\n=== SAVE THESE NOW — not stored in any file ===")
        print("Admin username: admin")
        print("Admin password: ChangeMe123!")
        print("Device ID: reader-01")
        print("Device token: dev-token-accesssync-2024")
        print("===============================================\n")
        print("Database seeded successfully!")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
