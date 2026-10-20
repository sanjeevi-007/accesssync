from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mode = Column(String(20), nullable=False)
    language = Column(String(5), nullable=False, default="en")
    is_sample = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    rfid_cards = relationship("RfidCard", back_populates="visitor")
