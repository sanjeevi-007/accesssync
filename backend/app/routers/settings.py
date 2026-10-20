from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.setting import Setting
from app.schemas.setting import SettingCreate, SettingUpdate, SettingResponse
from app.schemas.common import PaginatedResponse
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=PaginatedResponse[SettingResponse])
def list_settings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Setting)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return PaginatedResponse[SettingResponse](
        items=[SettingResponse.model_validate(s) for s in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{key}", response_model=SettingResponse)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": f"Setting with key '{key}' not found."}},
        )
    return SettingResponse.model_validate(setting)


@router.post("", response_model=SettingResponse, status_code=status.HTTP_201_CREATED)
def create_setting(payload: SettingCreate, db: Session = Depends(get_db)):
    existing = db.query(Setting).filter(Setting.key == payload.key).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "DUPLICATE_KEY", "message": f"Setting with key '{payload.key}' already exists."}},
        )
    setting = Setting(**payload.model_dump(), is_sample=False)
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return SettingResponse.model_validate(setting)


@router.put("/{key}", response_model=SettingResponse)
def update_setting(key: str, payload: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": f"Setting with key '{key}' not found."}},
        )
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(setting, k, v)
    db.commit()
    db.refresh(setting)
    return SettingResponse.model_validate(setting)
