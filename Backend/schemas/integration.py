from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class IntegrationBase(BaseModel):
    name: str
    enabled: bool = False
    config: Optional[Dict[str, Any]] = None

class IntegrationUpdate(BaseModel):
    enabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None

class IntegrationResponse(IntegrationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

