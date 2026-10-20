from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./database/accesssync.db"

    # Security
    SECRET_KEY: str = "CHANGE_ME_TO_A_LONG_RANDOM_STRING"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    # Default Admin
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "CHANGE_ME_IMMEDIATELY"

    # Device
    DEVICE_TOKEN_HASH: str = "CHANGE_ME_TO_HASHED_TOKEN"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # WebSocket
    WS_HEARTBEAT_TIMEOUT_SECONDS: int = 45

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
