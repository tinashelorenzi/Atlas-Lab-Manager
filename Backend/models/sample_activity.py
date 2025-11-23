from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class SampleActivity(Base):
    __tablename__ = "sample_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Who performed the action
    
    # Activity details
    activity_type = Column(String(50), nullable=False)  # created, updated, status_changed, collected, tested, etc.
    description = Column(Text)  # Human-readable description
    activity_data = Column(Text)  # JSON string for additional data
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    sample = relationship("Sample", backref="activities")
    user = relationship("User", backref="sample_activities")
    
    def __repr__(self):
        return f"<SampleActivity {self.activity_type} for Sample {self.sample_id}>"

