from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    library_id = Column(Integer, ForeignKey("libraries.id"), nullable=False, index=True)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False, index=True)
    criterion_id = Column(Integer, ForeignKey("criteria.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="not_assessed")
    notes = Column(Text, nullable=True)
    assessed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_sample = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    library = relationship("Library")
    area = relationship("Area")
    criterion = relationship("Criterion", back_populates="assessments")
    assessor = relationship("User")
