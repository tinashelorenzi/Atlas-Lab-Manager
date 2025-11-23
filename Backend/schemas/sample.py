from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SampleBase(BaseModel):
    customer_id: int
    project_id: Optional[int] = None
    sample_type_id: int
    name: str
    volume: Optional[str] = None
    conditions: Optional[str] = None
    notes: Optional[str] = None
    is_batch: bool = False
    batch_size: Optional[int] = None
    department_ids: List[int] = []  # List of department IDs
    test_type_ids: List[int] = []  # List of test type IDs

class SampleCreate(SampleBase):
    pass

class SampleUpdate(BaseModel):
    name: Optional[str] = None
    volume: Optional[str] = None
    conditions: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    department_ids: Optional[List[int]] = None
    test_type_ids: Optional[List[int]] = None

class SampleResponse(BaseModel):
    id: int
    sample_id: str
    customer_id: int
    project_id: Optional[int]
    sample_type_id: int
    name: str
    volume: Optional[str]
    conditions: Optional[str]
    notes: Optional[str]
    is_batch: bool
    batch_size: Optional[int]
    status: str
    created_at: datetime
    updated_at: datetime
    
    # Related data
    customer_name: str
    project_name: Optional[str]
    sample_type_name: str
    department_names: List[str] = []
    test_type_names: List[str] = []
    
    class Config:
        from_attributes = True

