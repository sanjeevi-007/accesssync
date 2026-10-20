from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.area import Area
from app.models.library import Library
from app.schemas.area import AreaCreate, AreaUpdate, AreaResponse
from app.schemas.common import PaginatedResponse
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/areas", tags=["areas"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=PaginatedResponse[AreaResponse])
def list_areas(
    library_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Area)
    if library_id is not None:
        query = query.filter(Area.library_id == library_id)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return PaginatedResponse[AreaResponse](
        items=[AreaResponse.model_validate(a) for a in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{id}", response_model=AreaResponse)
def get_area(id: int, db: Session = Depends(get_db)):
    area = db.query(Area).filter(Area.id == id).first()
    if not area:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Area not found."}},
        )
    return AreaResponse.model_validate(area)


@router.post("", response_model=AreaResponse, status_code=status.HTTP_201_CREATED)
def create_area(payload: AreaCreate, db: Session = Depends(get_db)):
    lib = db.query(Library).filter(Library.id == payload.library_id).first()
    if not lib:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "LIBRARY_NOT_FOUND", "message": "Referenced library does not exist."}},
        )
    area = Area(**payload.model_dump(), is_sample=False)
    db.add(area)
    db.commit()
    db.refresh(area)
    return AreaResponse.model_validate(area)


@router.put("/{id}", response_model=AreaResponse)
def update_area(id: int, payload: AreaUpdate, db: Session = Depends(get_db)):
    area = db.query(Area).filter(Area.id == id).first()
    if not area:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Area not found."}},
        )
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(area, k, v)
    db.commit()
    db.refresh(area)
    return AreaResponse.model_validate(area)


@router.delete("/{id}")
def delete_area(id: int, db: Session = Depends(get_db)):
    area = db.query(Area).filter(Area.id == id).first()
    if not area:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Area not found."}},
        )
    db.delete(area)
    db.commit()
    return {"message": "Area deleted successfully."}
