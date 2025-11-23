from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectBase(BaseModel):
    customer_id: int
    name: str
    project_type: Optional[str] = None
    details: Optional[str] = None
    status: Optional[str] = "active"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    project_type: Optional[str] = None
    details: Optional[str] = None
    status: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    project_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProjectWithCustomer(ProjectResponse):
    customer_name: str
    customer_email: Optional[str] = None

