from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EmailTemplateBase(BaseModel):
    name: str
    subject: str
    body: str

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None

class EmailTemplateResponse(EmailTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

