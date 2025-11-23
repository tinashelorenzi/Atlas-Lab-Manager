from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from database import get_db
from models.result_entry import ResultEntry, ResultValue
from models.sample import Sample
from models.sample_activity import SampleActivity
from models.user import User
from schemas.result_entry import (
    ResultEntryCreate, ResultEntryUpdate, ResultEntryResponse,
    ResultValueCreate, ResultValueUpdate, ResultValueResponse,
    ResultEntryWithSample
)
from routes.auth import get_current_user
from routes.settings import require_lab_admin_or_manager
import json

router = APIRouter(prefix="/api/result-entries", tags=["result-entries"])

def format_result_entry_response(result_entry: ResultEntry) -> dict:
    """Format result entry response with related data"""
    return {
        "id": result_entry.id,
        "sample_id": result_entry.sample_id,
        "sample_id_code": result_entry.sample.sample_id if result_entry.sample else "",
        "sample_name": result_entry.sample.name if result_entry.sample else "",
        "created_by_id": result_entry.created_by_id,
        "created_by_name": result_entry.created_by.full_name if result_entry.created_by else "",
        "is_committed": result_entry.is_committed,
        "committed_at": result_entry.committed_at.isoformat() if result_entry.committed_at else None,
        "committed_by_id": result_entry.committed_by_id,
        "committed_by_name": result_entry.committed_by.full_name if result_entry.committed_by else None,
        "notes": result_entry.notes,
        "result_values": [
            {
                "id": rv.id,
                "result_entry_id": rv.result_entry_id,
                "test_type": rv.test_type,
                "value": rv.value,
                "unit": rv.unit,
                "unit_type": rv.unit_type,
                "notes": rv.notes,
                "created_at": rv.created_at.isoformat() if rv.created_at else None,
                "updated_at": rv.updated_at.isoformat() if rv.updated_at else None,
            }
            for rv in result_entry.result_values
        ],
        "created_at": result_entry.created_at.isoformat() if result_entry.created_at else None,
        "updated_at": result_entry.updated_at.isoformat() if result_entry.updated_at else None,
    }

@router.get("/search", response_model=List[ResultEntryWithSample])
async def search_result_entries(
    q: str = Query(..., description="Search query (sample ID, name)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search for result entries by sample ID or name"""
    if not q or len(q.strip()) == 0:
        return []
    
    search_term = q.strip()
    search_term_escaped = search_term.replace('%', '\\%').replace('_', '\\_')
    search_pattern = f"%{search_term_escaped}%"
    search_pattern_upper = search_pattern.upper()
    
    query = db.query(ResultEntry).join(Sample)
    
    conditions = [
        func.upper(Sample.sample_id).like(search_pattern_upper),
        func.upper(Sample.name).like(search_pattern_upper),
    ]
    
    query = query.filter(or_(*conditions))
    
    result_entries = query.distinct().limit(50).all()
    
    formatted_results = []
    for entry in result_entries:
        data = format_result_entry_response(entry)
        if entry.sample:
            data["customer_name"] = entry.sample.customer.full_name if entry.sample.customer else ""
            data["project_name"] = entry.sample.project.name if entry.sample.project else None
            data["sample_type_name"] = entry.sample.sample_type.name if entry.sample.sample_type else ""
        formatted_results.append(data)
    
    return formatted_results

@router.get("/sample/{sample_id}", response_model=Optional[ResultEntryResponse])
async def get_result_entry_by_sample(
    sample_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get result entry for a specific sample"""
    result_entry = db.query(ResultEntry).filter(ResultEntry.sample_id == sample_id).first()
    if result_entry is None:
        return None
    
    return format_result_entry_response(result_entry)

@router.get("/{result_entry_id}", response_model=ResultEntryResponse)
async def get_result_entry(
    result_entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific result entry"""
    result_entry = db.query(ResultEntry).filter(ResultEntry.id == result_entry_id).first()
    if result_entry is None:
        raise HTTPException(status_code=404, detail="Result entry not found")
    
    return format_result_entry_response(result_entry)

@router.post("/", response_model=ResultEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_result_entry(
    result_entry: ResultEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new result entry for a sample"""
    # Verify sample exists
    sample = db.query(Sample).filter(Sample.id == result_entry.sample_id).first()
    if sample is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # Check if result entry already exists for this sample
    existing = db.query(ResultEntry).filter(ResultEntry.sample_id == result_entry.sample_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Result entry already exists for this sample")
    
    # Create result entry
    db_result_entry = ResultEntry(
        sample_id=result_entry.sample_id,
        created_by_id=current_user.id,
        notes=result_entry.notes,
    )
    db.add(db_result_entry)
    db.flush()
    
    # Create activity log
    activity = SampleActivity(
        sample_id=sample.id,
        user_id=current_user.id,
        activity_type="result_sheet_created",
        description=f"Result entry sheet created by {current_user.full_name}",
        activity_data=json.dumps({
            "result_entry_id": db_result_entry.id,
        })
    )
    db.add(activity)
    
    db.commit()
    db.refresh(db_result_entry)
    
    return format_result_entry_response(db_result_entry)

@router.post("/{result_entry_id}/values", response_model=ResultValueResponse, status_code=status.HTTP_201_CREATED)
async def add_result_value(
    result_entry_id: int,
    result_value: ResultValueCreate,
    reason: Optional[str] = Query(None, description="Reason for adding this result (required for managers/admins editing committed sheets)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a result value to a result entry"""
    result_entry = db.query(ResultEntry).filter(ResultEntry.id == result_entry_id).first()
    if result_entry is None:
        raise HTTPException(status_code=404, detail="Result entry not found")
    
    # Check if sheet is committed and user is trying to edit
    if result_entry.is_committed:
        # Only managers/admins can edit committed sheets
        if current_user.user_type not in ['lab_administrator', 'lab_manager']:
            raise HTTPException(status_code=403, detail="Only managers and administrators can edit committed result sheets")
        
        # Reason is required for editing committed sheets
        if not reason or not reason.strip():
            raise HTTPException(status_code=400, detail="Reason is required when editing committed result sheets")
    
    # Create result value
    db_result_value = ResultValue(
        result_entry_id=result_entry_id,
        test_type=result_value.test_type,
        value=result_value.value,
        unit=result_value.unit,
        unit_type=result_value.unit_type,
        notes=result_value.notes,
    )
    db.add(db_result_value)
    db.flush()
    
    # Create activity log
    activity_description = f"Result value added: {result_value.test_type} = {result_value.value}"
    if result_value.unit:
        activity_description += f" {result_value.unit}"
    if reason:
        activity_description += f" (Reason: {reason})"
    
    activity = SampleActivity(
        sample_id=result_entry.sample_id,
        user_id=current_user.id,
        activity_type="result_value_added",
        description=f"{activity_description} by {current_user.full_name}",
        activity_data=json.dumps({
            "result_entry_id": result_entry_id,
            "result_value_id": db_result_value.id,
            "test_type": result_value.test_type,
            "value": result_value.value,
            "reason": reason,
        })
    )
    db.add(activity)
    
    db.commit()
    db.refresh(db_result_value)
    
    return {
        "id": db_result_value.id,
        "result_entry_id": db_result_value.result_entry_id,
        "test_type": db_result_value.test_type,
        "value": db_result_value.value,
        "unit": db_result_value.unit,
        "unit_type": db_result_value.unit_type,
        "notes": db_result_value.notes,
        "created_at": db_result_value.created_at.isoformat() if db_result_value.created_at else None,
        "updated_at": db_result_value.updated_at.isoformat() if db_result_value.updated_at else None,
    }

@router.put("/{result_entry_id}/values/{value_id}", response_model=ResultValueResponse)
async def update_result_value(
    result_entry_id: int,
    value_id: int,
    result_value: ResultValueUpdate,
    reason: str = Query(..., description="Reason for editing this result (required)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Update a result value (only managers/admins)"""
    result_entry = db.query(ResultEntry).filter(ResultEntry.id == result_entry_id).first()
    if result_entry is None:
        raise HTTPException(status_code=404, detail="Result entry not found")
    
    db_result_value = db.query(ResultValue).filter(
        ResultValue.id == value_id,
        ResultValue.result_entry_id == result_entry_id
    ).first()
    if db_result_value is None:
        raise HTTPException(status_code=404, detail="Result value not found")
    
    if not reason or not reason.strip():
        raise HTTPException(status_code=400, detail="Reason is required when editing result values")
    
    # Track changes
    changes = []
    old_values = {
        "test_type": db_result_value.test_type,
        "value": db_result_value.value,
        "unit": db_result_value.unit,
        "unit_type": db_result_value.unit_type,
    }
    
    update_data = result_value.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if getattr(db_result_value, field) != value:
            changes.append(f"{field}: {old_values.get(field)} -> {value}")
            setattr(db_result_value, field, value)
    
    if changes:
        # Create activity log
        activity = SampleActivity(
            sample_id=result_entry.sample_id,
            user_id=current_user.id,
            activity_type="result_value_updated",
            description=f"Result value updated by {current_user.full_name}. Changes: {', '.join(changes)}. Reason: {reason}",
            activity_data=json.dumps({
                "result_entry_id": result_entry_id,
                "result_value_id": value_id,
                "changes": changes,
                "old_values": old_values,
                "new_values": update_data,
                "reason": reason,
            })
        )
        db.add(activity)
    
    db.commit()
    db.refresh(db_result_value)
    
    return {
        "id": db_result_value.id,
        "result_entry_id": db_result_value.result_entry_id,
        "test_type": db_result_value.test_type,
        "value": db_result_value.value,
        "unit": db_result_value.unit,
        "unit_type": db_result_value.unit_type,
        "notes": db_result_value.notes,
        "created_at": db_result_value.created_at.isoformat() if db_result_value.created_at else None,
        "updated_at": db_result_value.updated_at.isoformat() if db_result_value.updated_at else None,
    }

@router.delete("/{result_entry_id}/values/{value_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_result_value(
    result_entry_id: int,
    value_id: int,
    reason: str = Query(..., description="Reason for deleting this result (required)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Delete a result value (only managers/admins)"""
    result_entry = db.query(ResultEntry).filter(ResultEntry.id == result_entry_id).first()
    if result_entry is None:
        raise HTTPException(status_code=404, detail="Result entry not found")
    
    db_result_value = db.query(ResultValue).filter(
        ResultValue.id == value_id,
        ResultValue.result_entry_id == result_entry_id
    ).first()
    if db_result_value is None:
        raise HTTPException(status_code=404, detail="Result value not found")
    
    if not reason or not reason.strip():
        raise HTTPException(status_code=400, detail="Reason is required when deleting result values")
    
    # Store value info before deletion
    value_info = {
        "test_type": db_result_value.test_type,
        "value": db_result_value.value,
        "unit": db_result_value.unit,
    }
    
    # Create activity log before deletion
    activity = SampleActivity(
        sample_id=result_entry.sample_id,
        user_id=current_user.id,
        activity_type="result_value_deleted",
        description=f"Result value deleted: {value_info['test_type']} = {value_info['value']} {value_info.get('unit', '')} by {current_user.full_name}. Reason: {reason}",
        activity_data=json.dumps({
            "result_entry_id": result_entry_id,
            "result_value_id": value_id,
            "deleted_value": value_info,
            "reason": reason,
        })
    )
    db.add(activity)
    
    db.delete(db_result_value)
    db.commit()
    
    return None

@router.post("/{result_entry_id}/commit", response_model=ResultEntryResponse)
async def commit_result_entry(
    result_entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Commit/finalize a result entry"""
    result_entry = db.query(ResultEntry).filter(ResultEntry.id == result_entry_id).first()
    if result_entry is None:
        raise HTTPException(status_code=404, detail="Result entry not found")
    
    if result_entry.is_committed:
        raise HTTPException(status_code=400, detail="Result entry is already committed")
    
    # Check if there are any result values
    if not result_entry.result_values:
        raise HTTPException(status_code=400, detail="Cannot commit result entry without any result values")
    
    # Commit the result entry
    result_entry.is_committed = True
    from datetime import datetime, timezone
    result_entry.committed_at = datetime.now(timezone.utc)
    result_entry.committed_by_id = current_user.id
    
    # Create activity log
    activity = SampleActivity(
        sample_id=result_entry.sample_id,
        user_id=current_user.id,
        activity_type="result_sheet_committed",
        description=f"Result entry sheet committed by {current_user.full_name}",
        activity_data=json.dumps({
            "result_entry_id": result_entry_id,
            "result_values_count": len(result_entry.result_values),
        })
    )
    db.add(activity)
    
    db.commit()
    db.refresh(result_entry)
    
    return format_result_entry_response(result_entry)

@router.delete("/{result_entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_result_entry(
    result_entry_id: int,
    reason: str = Query(..., description="Reason for deleting this result entry (required)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Delete a result entry (only managers/admins)"""
    result_entry = db.query(ResultEntry).filter(ResultEntry.id == result_entry_id).first()
    if result_entry is None:
        raise HTTPException(status_code=404, detail="Result entry not found")
    
    if not reason or not reason.strip():
        raise HTTPException(status_code=400, detail="Reason is required when deleting result entries")
    
    # Create activity log before deletion
    activity = SampleActivity(
        sample_id=result_entry.sample_id,
        user_id=current_user.id,
        activity_type="result_sheet_deleted",
        description=f"Result entry sheet deleted by {current_user.full_name}. Reason: {reason}",
        activity_data=json.dumps({
            "result_entry_id": result_entry_id,
            "reason": reason,
        })
    )
    db.add(activity)
    
    db.delete(result_entry)
    db.commit()
    
    return None

