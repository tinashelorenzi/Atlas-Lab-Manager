from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ResultValueBase(BaseModel):
    test_type: str
    value: str
    unit: Optional[str] = None
    unit_type: Optional[str] = None
    notes: Optional[str] = None

class ResultValueCreate(ResultValueBase):
    pass

class ResultValueUpdate(BaseModel):
    test_type: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None
    unit_type: Optional[str] = None
    notes: Optional[str] = None

class ResultValueResponse(ResultValueBase):
    id: int
    result_entry_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ResultEntryBase(BaseModel):
    notes: Optional[str] = None

class ResultEntryCreate(ResultEntryBase):
    sample_id: int

class ResultEntryUpdate(BaseModel):
    notes: Optional[str] = None
    is_committed: Optional[bool] = None

class ResultEntryResponse(ResultEntryBase):
    id: int
    sample_id: int
    sample_id_code: str  # The sample.sample_id
    sample_name: str
    created_by_id: int
    created_by_name: str
    is_committed: bool
    committed_at: Optional[datetime] = None
    committed_by_id: Optional[int] = None
    committed_by_name: Optional[str] = None
    result_values: List[ResultValueResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ResultEntryWithSample(ResultEntryResponse):
    customer_name: str
    project_name: Optional[str] = None
    sample_type_name: str

