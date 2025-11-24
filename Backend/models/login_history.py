from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class LoginHistory(Base):
    __tablename__ = "login_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Nullable for failed logins
    email = Column(String(255), nullable=False, index=True)  # Email attempted
    success = Column(Boolean, default=False, nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 can be up to 45 chars
    user_agent = Column(Text, nullable=True)
    failure_reason = Column(String(255), nullable=True)  # e.g., "Invalid password", "User not found"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="login_history")
    
    def __repr__(self):
        return f"<LoginHistory {self.email} ({'success' if self.success else 'failed'})>"

