from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.device import Device
from app.core.security import decode_access_token, verify_password

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "NOT_AUTHENTICATED", "message": "Not authenticated."}},
        )
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Invalid or expired token."}},
        )
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Token missing subject."}},
        )
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "USER_NOT_FOUND", "message": "User not found or inactive."}},
        )
    return user


def require_role(*allowed_roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": {
                        "code": "INSUFFICIENT_ROLE",
                        "message": f"Role '{current_user.role}' not authorized. Required: {', '.join(allowed_roles)}.",
                    }
                },
            )
        return current_user
    return role_checker


async def verify_device_token(
    x_device_token: str = Header(..., alias="X-Device-Token"),
    db: Session = Depends(get_db),
) -> Device:
    devices = db.query(Device).filter(Device.is_active == True).all()
    for device in devices:
        if verify_password(x_device_token, device.token_hash):
            return device
    raise HTTPException(
        status_code=401,
        detail={"error": {"code": "INVALID_DEVICE_TOKEN", "message": "Invalid or inactive device token."}},
    )
