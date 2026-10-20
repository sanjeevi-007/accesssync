from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.routers import (
    auth_router,
    libraries_router,
    areas_router,
    cards_router,
    instructions_router,
    criteria_router,
    assessments_router,
    settings_router,
    visitors_router,
)

settings = get_settings()

app = FastAPI(
    title="ACCESS-EASE API",
    description="Accessibility guidance platform for public libraries",
    version="0.2.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(libraries_router)
app.include_router(areas_router)
app.include_router(cards_router)
app.include_router(instructions_router)
app.include_router(criteria_router)
app.include_router(assessments_router)
app.include_router(settings_router)
app.include_router(visitors_router)


# HTTPException handler — preserves structured error shape
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "HTTP_ERROR", "message": str(exc.detail)}},
    )


# Global exception handler — all unhandled exceptions return the standard error shape
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
            }
        },
    )


# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.2.0"}


# Root endpoint — basic info
@app.get("/")
async def root():
    return {
        "name": "ACCESS-EASE API",
        "version": "0.2.0",
        "docs": "/docs",
        "health": "/api/health",
    }
