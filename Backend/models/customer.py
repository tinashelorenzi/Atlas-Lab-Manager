from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from database import Base

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(5), unique=True, nullable=False, index=True)  # 5 character unique identifier
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), index=True)
    phone = Column(String(50))
    company_name = Column(String(255))
    address = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Customer {self.full_name} ({self.customer_id})>"

