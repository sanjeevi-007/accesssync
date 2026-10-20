from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.instruction import Instruction
from app.models.library import Library
from app.models.area import Area
from app.schemas.instruction import InstructionCreate, InstructionUpdate, InstructionResponse
from app.schemas.common import PaginatedResponse
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/instructions", tags=["instructions"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=PaginatedResponse[InstructionResponse])
def list_instructions(
    library_id: Optional[int] = Query(None),
    area_id: Optional[int] = Query(None),
    mode: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Instruction)
    if library_id is not None:
        query = query.filter(Instruction.library_id == library_id)
    if area_id is not None:
        query = query.filter(Instruction.area_id == area_id)
    if mode is not None:
        query = query.filter(Instruction.mode == mode)
    if language is not None:
        query = query.filter(Instruction.language == language)
    total = query.count()
    items = query.order_by(Instruction.priority.asc(), Instruction.id.asc()).offset(skip).limit(limit).all()
    return PaginatedResponse[InstructionResponse](
        items=[InstructionResponse.model_validate(i) for i in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{id}", response_model=InstructionResponse)
def get_instruction(id: int, db: Session = Depends(get_db)):
    inst = db.query(Instruction).filter(Instruction.id == id).first()
    if not inst:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Instruction not found."}},
        )
    return InstructionResponse.model_validate(inst)


@router.post("", response_model=InstructionResponse, status_code=status.HTTP_201_CREATED)
def create_instruction(payload: InstructionCreate, db: Session = Depends(get_db)):
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

    inst = Instruction(**payload.model_dump(), is_sample=False)
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return InstructionResponse.model_validate(inst)


@router.put("/{id}", response_model=InstructionResponse)
def update_instruction(id: int, payload: InstructionUpdate, db: Session = Depends(get_db)):
    inst = db.query(Instruction).filter(Instruction.id == id).first()
    if not inst:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Instruction not found."}},
        )
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(inst, k, v)
    db.commit()
    db.refresh(inst)
    return InstructionResponse.model_validate(inst)


@router.delete("/{id}")
def delete_instruction(id: int, db: Session = Depends(get_db)):
    inst = db.query(Instruction).filter(Instruction.id == id).first()
    if not inst:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Instruction not found."}},
        )
    db.delete(inst)
    db.commit()
    return {"message": "Instruction deleted successfully."}
