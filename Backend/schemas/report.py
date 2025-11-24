from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from models.report import ReportStatus

class ReportBase(BaseModel):
    notes: Optional[str] = None

class ReportCreate(ReportBase):
    result_entry_id: int

class ReportUpdate(BaseModel):
    notes: Optional[str] = None
    status: Optional[ReportStatus] = None

class ReportResponse(ReportBase):
    id: int
    result_entry_id: int
    report_number: str
    status: ReportStatus
    generated_at: datetime
    generated_by_id: int
    generated_by_name: str
    amended_at: Optional[datetime] = None
    amended_by_id: Optional[int] = None
    amended_by_name: Optional[str] = None
    validated_at: Optional[datetime] = None
    validated_by_id: Optional[int] = None
    validated_by_name: Optional[str] = None
    finalized_at: Optional[datetime] = None
    finalized_by_id: Optional[int] = None
    finalized_by_name: Optional[str] = None
    fingerprint: Optional[str] = None
    view_key: Optional[str] = None
    sample_id_code: str
    sample_name: str
    customer_name: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ReportWithDetails(ReportResponse):
    report_data: Optional[Dict[str, Any]] = None
    result_entry: Optional[Dict[str, Any]] = None

