from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class ReportStatus(str, enum.Enum):
    PROPOSED = "proposed"  # Amended, awaiting validation
    VALIDATED = "validated"  # Validated by manager/admin, ready for finalization
    FINALIZED = "finalized"  # Finalized and published

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    result_entry_id = Column(Integer, ForeignKey("result_entries.id"), nullable=False, index=True)
    
    # Report metadata
    report_number = Column(String(50), unique=True, nullable=False, index=True)  # e.g., "RPT-2024-001"
    status = Column(SQLEnum(ReportStatus), default=ReportStatus.PROPOSED, nullable=False, index=True)
    
    # Tracking dates
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    generated_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    amended_at = Column(DateTime(timezone=True), nullable=True)  # When last amended
    amended_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    validated_at = Column(DateTime(timezone=True), nullable=True)  # When validated by manager/admin
    validated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    finalized_at = Column(DateTime(timezone=True), nullable=True)  # When finalized
    finalized_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Report content (stored as JSON for flexibility)
    report_data = Column(Text, nullable=True)  # JSON string with report structure
    
    # Fingerprint/hash for verification
    fingerprint = Column(String(64), nullable=True, index=True)  # SHA-256 hash of report content
    
    # Public view key for customer access
    view_key = Column(String(64), unique=True, nullable=True, index=True)  # Unique key for customer to view report
    
    # Notes/comments
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    result_entry = relationship("ResultEntry", backref="reports")
    generated_by = relationship("User", foreign_keys=[generated_by_id], backref="generated_reports")
    amended_by = relationship("User", foreign_keys=[amended_by_id], backref="amended_reports")
    validated_by = relationship("User", foreign_keys=[validated_by_id], backref="validated_reports")
    finalized_by = relationship("User", foreign_keys=[finalized_by_id], backref="finalized_reports")
    
    def __repr__(self):
        return f"<Report {self.report_number} ({self.status.value})>"

