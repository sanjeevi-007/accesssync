from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.library import Library
from app.schemas.library import LibraryCreate, LibraryUpdate, LibraryResponse
from app.schemas.common import PaginatedResponse
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/libraries", tags=["libraries"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=PaginatedResponse[LibraryResponse])
def list_libraries(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Library)
    total = query.count()
    libraries = query.offset(skip).limit(limit).all()

    items = []
    for lib in libraries:
        lib_res = LibraryResponse.model_validate(lib)
        lib_res.areas_count = len(lib.areas) if lib.areas else 0
        items.append(lib_res)

    return PaginatedResponse[LibraryResponse](items=items, total=total, skip=skip, limit=limit)


@router.get("/{id}", response_model=LibraryResponse)
def get_library(id: int, db: Session = Depends(get_db)):
    lib = db.query(Library).filter(Library.id == id).first()
    if not lib:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Library not found."}},
        )
    lib_res = LibraryResponse.model_validate(lib)
    lib_res.areas_count = len(lib.areas) if lib.areas else 0
    return lib_res


@router.post("", response_model=LibraryResponse, status_code=status.HTTP_201_CREATED)
def create_library(payload: LibraryCreate, db: Session = Depends(get_db)):
    existing = db.query(Library).filter(Library.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "DUPLICATE_CODE", "message": f"Library with code '{payload.code}' already exists."}},
        )
    lib = Library(**payload.model_dump(), is_sample=False)
    db.add(lib)
    db.commit()
    db.refresh(lib)
    lib_res = LibraryResponse.model_validate(lib)
    lib_res.areas_count = 0
    return lib_res


@router.put("/{id}", response_model=LibraryResponse)
def update_library(id: int, payload: LibraryUpdate, db: Session = Depends(get_db)):
    lib = db.query(Library).filter(Library.id == id).first()
    if not lib:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Library not found."}},
        )
    update_data = payload.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"] != lib.code:
        existing = db.query(Library).filter(Library.code == update_data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={"error": {"code": "DUPLICATE_CODE", "message": f"Library with code '{update_data['code']}' already exists."}},
            )
    for k, v in update_data.items():
        setattr(lib, k, v)
    db.commit()
    db.refresh(lib)
    lib_res = LibraryResponse.model_validate(lib)
    lib_res.areas_count = len(lib.areas) if lib.areas else 0
    return lib_res


@router.delete("/{id}")
def delete_library(id: int, db: Session = Depends(get_db)):
    lib = db.query(Library).filter(Library.id == id).first()
    if not lib:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Library not found."}},
        )
    db.delete(lib)
    db.commit()
    return {"message": "Library deleted successfully."}
