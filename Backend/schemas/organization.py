from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrganizationBase(BaseModel):
    name: str
    tagline: Optional[str] = None
    address: Optional[str] = None
    vat_tax_number: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = "UTC"
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    vat_tax_number: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None

class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

