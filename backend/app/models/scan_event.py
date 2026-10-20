from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class ScanEvent(Base):
    __tablename__ = "scan_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(36), unique=True, nullable=False, index=True)
    card_uid = Column(String(20), nullable=False, index=True)
    result = Column(String(20), nullable=False)  # "accepted" or "rejected"
    reason = Column(String(50), nullable=True)   # "UNREGISTERED", "INACTIVE", or null
    mode = Column(String(20), nullable=True)
    instruction_snapshot = Column(Text, nullable=True)  # JSON string
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    is_sample = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    device = relationship("Device")
