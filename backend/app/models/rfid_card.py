# Only one active card per UID — enforced at application level in Phase 1.
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class RfidCard(Base):
    __tablename__ = "rfid_cards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uid = Column(String(20), nullable=False, index=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id"), nullable=False)
    label = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_sample = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    visitor = relationship("Visitor", back_populates="rfid_cards")
