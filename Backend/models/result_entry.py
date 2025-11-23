from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class ResultEntry(Base):
    __tablename__ = "result_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Status
    is_committed = Column(Boolean, default=False, nullable=False)  # Whether results are finalized
    committed_at = Column(DateTime(timezone=True), nullable=True)  # When results were committed
    committed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who committed
    
    # Notes
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    sample = relationship("Sample", backref="result_entries")
    created_by = relationship("User", foreign_keys=[created_by_id], backref="created_result_entries")
    committed_by = relationship("User", foreign_keys=[committed_by_id], backref="committed_result_entries")
    result_values = relationship("ResultValue", back_populates="result_entry", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ResultEntry {self.id} for Sample {self.sample_id} (Committed: {self.is_committed})>"


class ResultValue(Base):
    __tablename__ = "result_values"
    
    id = Column(Integer, primary_key=True, index=True)
    result_entry_id = Column(Integer, ForeignKey("result_entries.id"), nullable=False, index=True)
    
    # Test result details
    test_type = Column(String(255), nullable=False)  # e.g., "Concentration", "pH", "Temperature"
    value = Column(String(255), nullable=False)  # The actual result value
    unit = Column(String(50), nullable=True)  # e.g., "mg/L", "%", "°C", "ppm"
    unit_type = Column(String(50), nullable=True)  # e.g., "percentage", "SI unit", "custom"
    
    # Metadata
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    result_entry = relationship("ResultEntry", back_populates="result_values")
    
    def __repr__(self):
        return f"<ResultValue {self.test_type}: {self.value} {self.unit}>"

