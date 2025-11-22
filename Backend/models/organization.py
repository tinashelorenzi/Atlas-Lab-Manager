from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from database import Base

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    tagline = Column(String(500))
    address = Column(Text)
    vat_tax_number = Column(String(100))
    website = Column(String(500))
    timezone = Column(String(100), default="UTC")
    phone = Column(String(50))
    email = Column(String(255))
    logo_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Organization {self.name} ({self.id})>"

