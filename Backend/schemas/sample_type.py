from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SampleTypeBase(BaseModel):
    name: str
    description: Optional[str] = None

class SampleTypeCreate(SampleTypeBase):
    pass

class SampleTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SampleTypeResponse(SampleTypeBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

