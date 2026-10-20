from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.assessment import Assessment
from app.models.library import Library
from app.models.area import Area
from app.models.criterion import Criterion
from app.models.user import User
from app.schemas.assessment import (
    AssessmentCreate, AssessmentUpdate, AssessmentResponse, AssessmentScoreResponse
)
from app.schemas.common import PaginatedResponse
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/assessments", tags=["assessments"], dependencies=[Depends(get_current_user)])


@router.get("/score", response_model=AssessmentScoreResponse)
def get_assessment_score(
    library_id: int = Query(...),
    db: Session = Depends(get_db),
):
    lib = db.query(Library).filter(Library.id == library_id).first()
    if not lib:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "LIBRARY_NOT_FOUND", "message": "Library not found."}},
        )

    assessments = db.query(Assessment).filter(Assessment.library_id == library_id).all()

    pass_count = sum(1 for a in assessments if a.status == "pass")
    needs_imp_count = sum(1 for a in assessments if a.status == "needs_improvement")
    fail_count = sum(1 for a in assessments if a.status == "fail")
    not_assessed_count = sum(1 for a in assessments if a.status == "not_assessed")

    total_assessed = pass_count + needs_imp_count + fail_count
    if total_assessed > 0:
        score = round((pass_count / total_assessed) * 100.0, 1)
    else:
        score = None

    return AssessmentScoreResponse(
        library_id=library_id,
        score=score,
        label="Internal assessment indicator, not a certified accessibility rating.",
        total_assessed=total_assessed,
        breakdown={
            "pass": pass_count,
            "needs_improvement": needs_imp_count,
            "fail": fail_count,
            "not_assessed": not_assessed_count,
        },
    )


@router.get("", response_model=PaginatedResponse[AssessmentResponse])
def list_assessments(
    library_id: Optional[int] = Query(None),
    area_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Assessment)
    if library_id is not None:
        query = query.filter(Assessment.library_id == library_id)
    if area_id is not None:
        query = query.filter(Assessment.area_id == area_id)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return PaginatedResponse[AssessmentResponse](
        items=[AssessmentResponse.model_validate(a) for a in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{id}", response_model=AssessmentResponse)
def get_assessment(id: int, db: Session = Depends(get_db)):
    ass = db.query(Assessment).filter(Assessment.id == id).first()
    if not ass:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Assessment not found."}},
        )
    return AssessmentResponse.model_validate(ass)


@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_assessment(
    payload: AssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lib = db.query(Library).filter(Library.id == payload.library_id).first()
    if not lib:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "LIBRARY_NOT_FOUND", "message": "Referenced library does not exist."}},
        )
    area = db.query(Area).filter(Area.id == payload.area_id).first()
    if not area:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "AREA_NOT_FOUND", "message": "Referenced area does not exist."}},
        )
    crit = db.query(Criterion).filter(Criterion.id == payload.criterion_id).first()
    if not crit:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "CRITERION_NOT_FOUND", "message": "Referenced criterion does not exist."}},
        )

    ass = Assessment(
        **payload.model_dump(),
        assessed_by=current_user.id,
        is_sample=False,
    )
    db.add(ass)
    db.commit()
    db.refresh(ass)
    return AssessmentResponse.model_validate(ass)


@router.put("/{id}", response_model=AssessmentResponse)
def update_assessment(
    id: int,
    payload: AssessmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ass = db.query(Assessment).filter(Assessment.id == id).first()
    if not ass:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Assessment not found."}},
        )
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(ass, k, v)
    ass.assessed_by = current_user.id
    db.commit()
    db.refresh(ass)
    return AssessmentResponse.model_validate(ass)


@router.delete("/{id}")
def delete_assessment(id: int, db: Session = Depends(get_db)):
    ass = db.query(Assessment).filter(Assessment.id == id).first()
    if not ass:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Assessment not found."}},
        )
    db.delete(ass)
    db.commit()
    return {"message": "Assessment deleted successfully."}
