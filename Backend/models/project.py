from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(8), unique=True, nullable=False, index=True)  # 8 character unique identifier
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    project_type = Column(String(100))  # e.g., "mining", "construction", "research", etc.
    details = Column(Text)  # Project description and details
    status = Column(String(50), default="active")  # active, completed, on_hold, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship
    customer = relationship("Customer", backref="projects")
    
    def __repr__(self):
        return f"<Project {self.name} ({self.project_id})>"

