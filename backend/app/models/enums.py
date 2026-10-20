import enum


class Mode(str, enum.Enum):
    blind = "blind"
    hearing = "hearing"
    low_vision = "low_vision"


class Language(str, enum.Enum):
    en = "en"
    ta = "ta"
    hi = "hi"


class AssessmentStatus(str, enum.Enum):
    pass_ = "pass"
    needs_improvement = "needs_improvement"
    fail = "fail"
    not_assessed = "not_assessed"


class AreaType(str, enum.Enum):
    entrance = "entrance"
    reception = "reception"
    shelves = "shelves"
    reading_hall = "reading_hall"
    computer_section = "computer_section"
    children_section = "children_section"
    restroom = "restroom"
    lift = "lift"
    stairs = "stairs"
    corridor = "corridor"
    exit = "exit"
    assembly_point = "assembly_point"
    parking = "parking"


class UserRole(str, enum.Enum):
    admin = "admin"
    library_manager = "library_manager"
    accessibility_staff = "accessibility_staff"
