from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Sample(Base):
    __tablename__ = "samples"
    
    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(String(10), unique=True, nullable=False, index=True)  # 10 character unique identifier
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)  # Optional
    sample_type_id = Column(Integer, ForeignKey("sample_types.id"), nullable=False, index=True)
    
    # Sample details
    name = Column(String(255), nullable=False)  # Sample name/identifier
    volume = Column(String(100))  # Sample volume (e.g., "500ml", "2kg")
    conditions = Column(Text)  # Container, storage conditions, etc.
    notes = Column(Text)  # Additional notes
    
    # Batch information
    is_batch = Column(Boolean, default=False, nullable=False)
    batch_size = Column(Integer, nullable=True)  # Number of samples in batch (if is_batch=True)
    
    # Status
    status = Column(String(50), default="pending")  # pending, in_progress, completed, cancelled
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    customer = relationship("Customer", backref="samples")
    project = relationship("Project", backref="samples")
    sample_type = relationship("SampleType", backref="samples")
    
    # Many-to-many relationships
    departments = relationship("Department", secondary="sample_departments", back_populates="samples")
    test_types = relationship("TestType", secondary="sample_tests", back_populates="samples")
    
    def __repr__(self):
        return f"<Sample {self.name} ({self.sample_id})>"

# Junction tables for many-to-many relationships
from sqlalchemy import Table

sample_departments = Table(
    "sample_departments",
    Base.metadata,
    Column("sample_id", Integer, ForeignKey("samples.id"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id"), primary_key=True),
)

sample_tests = Table(
    "sample_tests",
    Base.metadata,
    Column("sample_id", Integer, ForeignKey("samples.id"), primary_key=True),
    Column("test_type_id", Integer, ForeignKey("test_types.id"), primary_key=True),
)

# Update Department and TestType models to include back_populates
# This will be done in the models themselves

