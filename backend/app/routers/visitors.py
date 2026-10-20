from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.visitor import Visitor
from app.schemas.visitor import VisitorCreate, VisitorUpdate, VisitorResponse
from app.schemas.common import PaginatedResponse
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/visitors", tags=["visitors"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=PaginatedResponse[VisitorResponse])
def list_visitors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Visitor)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return PaginatedResponse[VisitorResponse](
        items=[VisitorResponse.model_validate(v) for v in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{id}", response_model=VisitorResponse)
def get_visitor(id: int, db: Session = Depends(get_db)):
    visitor = db.query(Visitor).filter(Visitor.id == id).first()
    if not visitor:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Visitor not found."}},
        )
    return VisitorResponse.model_validate(visitor)


@router.post("", response_model=VisitorResponse, status_code=status.HTTP_201_CREATED)
def create_visitor(payload: VisitorCreate, db: Session = Depends(get_db)):
    visitor = Visitor(**payload.model_dump(), is_sample=False)
    db.add(visitor)
    db.commit()
    db.refresh(visitor)
    return VisitorResponse.model_validate(visitor)


@router.put("/{id}", response_model=VisitorResponse)
def update_visitor(id: int, payload: VisitorUpdate, db: Session = Depends(get_db)):
    visitor = db.query(Visitor).filter(Visitor.id == id).first()
    if not visitor:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Visitor not found."}},
        )
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(visitor, k, v)
    db.commit()
    db.refresh(visitor)
    return VisitorResponse.model_validate(visitor)


@router.delete("/{id}")
def delete_visitor(id: int, db: Session = Depends(get_db)):
    visitor = db.query(Visitor).filter(Visitor.id == id).first()
    if not visitor:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Visitor not found."}},
        )
    db.delete(visitor)
    db.commit()
    return {"message": "Visitor deleted successfully."}
