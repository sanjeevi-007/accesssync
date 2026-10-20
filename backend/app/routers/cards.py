import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.rfid_card import RfidCard
from app.models.visitor import Visitor
from app.schemas.rfid_card import RfidCardCreate, RfidCardUpdate, RfidCardResponse
from app.schemas.common import PaginatedResponse
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/cards", tags=["cards"], dependencies=[Depends(get_current_user)])


def normalize_and_validate_uid(raw_uid: str) -> str:
    cleaned = re.sub(r"[\s\:\-]", "", raw_uid).upper()
    if not (8 <= len(cleaned) <= 20) or not re.fullmatch(r"^[0-9A-F]{8,20}$", cleaned):
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "INVALID_UID", "message": "UID must be 8 to 20 uppercase hex characters."}},
        )
    return cleaned


@router.get("", response_model=PaginatedResponse[RfidCardResponse])
def list_cards(
    visitor_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(RfidCard)
    if visitor_id is not None:
        query = query.filter(RfidCard.visitor_id == visitor_id)
    if is_active is not None:
        query = query.filter(RfidCard.is_active == is_active)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return PaginatedResponse[RfidCardResponse](
        items=[RfidCardResponse.model_validate(c) for c in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{id}", response_model=RfidCardResponse)
def get_card(id: int, db: Session = Depends(get_db)):
    card = db.query(RfidCard).filter(RfidCard.id == id).first()
    if not card:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Card not found."}},
        )
    return RfidCardResponse.model_validate(card)


@router.post("", response_model=RfidCardResponse, status_code=status.HTTP_201_CREATED)
def create_card(payload: RfidCardCreate, db: Session = Depends(get_db)):
    clean_uid = normalize_and_validate_uid(payload.uid)

    # Check for existing ACTIVE card with same UID
    active_existing = db.query(RfidCard).filter(
        RfidCard.uid == clean_uid,
        RfidCard.is_active == True,
    ).first()
    if active_existing:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "DUPLICATE_ACTIVE_CARD", "message": f"An active card with UID '{clean_uid}' already exists."}},
        )

    visitor = db.query(Visitor).filter(Visitor.id == payload.visitor_id).first()
    if not visitor:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "VISITOR_NOT_FOUND", "message": "Referenced visitor does not exist."}},
        )

    card = RfidCard(
        uid=clean_uid,
        visitor_id=payload.visitor_id,
        label=payload.label,
        is_active=True,
        is_sample=False,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return RfidCardResponse.model_validate(card)


@router.put("/{id}", response_model=RfidCardResponse)
def update_card(id: int, payload: RfidCardUpdate, db: Session = Depends(get_db)):
    card = db.query(RfidCard).filter(RfidCard.id == id).first()
    if not card:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Card not found."}},
        )

    update_data = payload.model_dump(exclude_unset=True)
    # If activating this card, ensure no other active card exists with this UID
    if update_data.get("is_active") is True and not card.is_active:
        active_existing = db.query(RfidCard).filter(
            RfidCard.uid == card.uid,
            RfidCard.is_active == True,
            RfidCard.id != card.id,
        ).first()
        if active_existing:
            raise HTTPException(
                status_code=409,
                detail={"error": {"code": "DUPLICATE_ACTIVE_CARD", "message": f"Another active card with UID '{card.uid}' already exists."}},
            )

    for k, v in update_data.items():
        setattr(card, k, v)
    db.commit()
    db.refresh(card)
    return RfidCardResponse.model_validate(card)


@router.delete("/{id}", response_model=RfidCardResponse)
def delete_card(id: int, db: Session = Depends(get_db)):
    card = db.query(RfidCard).filter(RfidCard.id == id).first()
    if not card:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Card not found."}},
        )
    # Deactivate, do not remove
    card.is_active = False
    db.commit()
    db.refresh(card)
    return RfidCardResponse.model_validate(card)
