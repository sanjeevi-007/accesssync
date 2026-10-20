from app.routers.auth import router as auth_router
from app.routers.libraries import router as libraries_router
from app.routers.areas import router as areas_router
from app.routers.cards import router as cards_router
from app.routers.instructions import router as instructions_router
from app.routers.criteria import router as criteria_router
from app.routers.assessments import router as assessments_router
from app.routers.settings import router as settings_router
from app.routers.visitors import router as visitors_router
from app.routers.scans import router as scans_router
from app.routers.devices import router as devices_router
from app.routers.ws import router as ws_router

__all__ = [
    "auth_router",
    "libraries_router",
    "areas_router",
    "cards_router",
    "instructions_router",
    "criteria_router",
    "assessments_router",
    "settings_router",
    "visitors_router",
    "scans_router",
    "devices_router",
    "ws_router",
]
