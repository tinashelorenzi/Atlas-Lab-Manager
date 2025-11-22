from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base
import enum

class UserType(str, enum.Enum):
    SUPER_ADMINISTRATOR = "super_administrator"
    LAB_ADMINISTRATOR = "lab_administrator"
    LAB_MANAGER = "lab_manager"
    LAB_ANALYST = "lab_analyst"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    user_type = Column(Enum(UserType), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<User {self.email} ({self.user_type})>"

