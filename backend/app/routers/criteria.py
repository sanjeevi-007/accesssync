from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.criterion import Criterion
from app.schemas.criterion import CriterionCreate, CriterionUpdate, CriterionResponse
from app.schemas.common import PaginatedResponse
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/criteria", tags=["criteria"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=PaginatedResponse[CriterionResponse])
def list_criteria(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Criterion)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return PaginatedResponse[CriterionResponse](
        items=[CriterionResponse.model_validate(c) for c in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{id}", response_model=CriterionResponse)
def get_criterion(id: int, db: Session = Depends(get_db)):
    crit = db.query(Criterion).filter(Criterion.id == id).first()
    if not crit:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Criterion not found."}},
        )
    return CriterionResponse.model_validate(crit)


@router.post("", response_model=CriterionResponse, status_code=status.HTTP_201_CREATED)
def create_criterion(payload: CriterionCreate, db: Session = Depends(get_db)):
    crit = Criterion(**payload.model_dump(), is_sample=False)
    db.add(crit)
    db.commit()
    db.refresh(crit)
    return CriterionResponse.model_validate(crit)


@router.put("/{id}", response_model=CriterionResponse)
def update_criterion(id: int, payload: CriterionUpdate, db: Session = Depends(get_db)):
    crit = db.query(Criterion).filter(Criterion.id == id).first()
    if not crit:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Criterion not found."}},
        )
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(crit, k, v)
    db.commit()
    db.refresh(crit)
    return CriterionResponse.model_validate(crit)


@router.delete("/{id}")
def delete_criterion(id: int, db: Session = Depends(get_db)):
    crit = db.query(Criterion).filter(Criterion.id == id).first()
    if not crit:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Criterion not found."}},
        )
    db.delete(crit)
    db.commit()
    return {"message": "Criterion deleted successfully."}
