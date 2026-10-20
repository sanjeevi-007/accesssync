from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.user import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    must_change_password: bool


class MeResponse(BaseModel):
    username: str
    role: str
    is_active: bool
    must_change_password: bool


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Incorrect username or password."}},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail={"error": {"code": "ACCOUNT_DISABLED", "message": "Account disabled."}},
        )
    token = create_access_token({"sub": user.username, "role": user.role})
    return LoginResponse(
        access_token=token,
        role=user.role,
        must_change_password=user.must_change_password,
    )


@router.get("/me", response_model=MeResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return MeResponse(
        username=current_user.username,
        role=current_user.role,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
    )


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "WRONG_CURRENT_PASSWORD", "message": "Current password is incorrect."}},
        )
    if req.current_password == req.new_password:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "SAME_PASSWORD", "message": "New password must differ."}},
        )
    current_user.password_hash = get_password_hash(req.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password changed successfully."}
