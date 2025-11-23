from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TestTypeBase(BaseModel):
    name: str
    description: Optional[str] = None

class TestTypeCreate(TestTypeBase):
    pass

class TestTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class TestTypeResponse(TestTypeBase):
    id: int
    department_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentResponse(DepartmentBase):
    id: int
    is_active: bool
    test_types: List[TestTypeResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

