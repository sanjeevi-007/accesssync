from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings

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
