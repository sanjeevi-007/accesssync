from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Area(Base):
    __tablename__ = "areas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    library_id = Column(Integer, ForeignKey("libraries.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    area_type = Column(String(30), nullable=False)
    floor = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    is_sample = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    library = relationship("Library", back_populates="areas")
    instructions = relationship("Instruction", back_populates="area")
