from sqlalchemy import Column, Integer, DateTime, ForeignKey, Text, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class UserImpersonation(Base):
    __tablename__ = "user_impersonations"
    
    id = Column(Integer, primary_key=True, index=True)
    super_admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # Super admin doing the impersonation
    impersonated_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # User being impersonated
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    reason = Column(Text, nullable=True)  # Optional reason for impersonation
    ip_address = Column(String(45), nullable=True)
    
    # Relationships
    super_admin = relationship("User", foreign_keys=[super_admin_id], backref="impersonations_started")
    impersonated_user = relationship("User", foreign_keys=[impersonated_user_id], backref="impersonations_received")
    
    def __repr__(self):
        return f"<UserImpersonation {self.super_admin_id} -> {self.impersonated_user_id}>"

