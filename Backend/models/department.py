from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to test types
    test_types = relationship("TestType", back_populates="department", cascade="all, delete-orphan")
    # Many-to-many relationship with samples (defined in sample.py)
    samples = relationship("Sample", secondary="sample_departments", back_populates="departments")
    
    def __repr__(self):
        return f"<Department {self.name}>"

