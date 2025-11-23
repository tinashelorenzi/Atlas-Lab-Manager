from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from database import get_db
from models.sample import Sample
from models.customer import Customer
from models.project import Project
from models.sample_type import SampleType
from models.department import Department
from models.test_type import TestType
from models.user import User
from models.sample_activity import SampleActivity
from schemas.sample import SampleCreate, SampleUpdate, SampleResponse
from routes.auth import get_current_user
from utils.sample_id_generator import generate_sample_id
import re
import json
from Levenshtein import distance as levenshtein_distance

router = APIRouter(prefix="/api/samples", tags=["samples"])

@router.get("/search", response_model=List[SampleResponse])
async def search_samples(
    q: str = Query(..., description="Search query (sample ID, name, customer name)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enhanced search for samples with case-insensitive partial matching"""
    if not q or len(q.strip()) == 0:
        return []
    
    # Clean and escape the query for LIKE pattern
    search_term = q.strip()
    # Escape special SQL LIKE characters
    search_term_escaped = search_term.replace('%', '\\%').replace('_', '\\_')
    # Create pattern for partial matching (contains)
    search_pattern = f"%{search_term_escaped}%"
    
    # Build query with case-insensitive LIKE matching
    query = db.query(Sample).join(Customer).outerjoin(Project).outerjoin(SampleType)
    
    # Case-insensitive search across multiple fields
    # Use UPPER() on field and apply UPPER() to the pattern string
    search_pattern_upper = search_pattern.upper()
    conditions = [
        func.upper(Sample.sample_id).like(search_pattern_upper),
        func.upper(Sample.name).like(search_pattern_upper),
        func.upper(Customer.full_name).like(search_pattern_upper),
        func.upper(Customer.email).like(search_pattern_upper),
        func.upper(Customer.company_name).like(search_pattern_upper),
        func.upper(Customer.customer_id).like(search_pattern_upper),  # Customer code
        func.upper(Project.name).like(search_pattern_upper),
        func.upper(SampleType.name).like(search_pattern_upper),
    ]
    
    # Apply OR condition for all search fields
    query = query.filter(or_(*conditions))
    
    # Get results and remove duplicates
    samples = query.distinct().limit(50).all()
    
    # Format results
    formatted_results = []
    for sample in samples:
        formatted_results.append(format_sample_response(sample))
    
    return formatted_results

@router.get("/", response_model=List[SampleResponse])
async def get_samples(
    skip: int = 0,
    limit: int = 100,
    customer_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all samples, optionally filtered"""
    query = db.query(Sample)
    
    if customer_id:
        query = query.filter(Sample.customer_id == customer_id)
    if project_id:
        query = query.filter(Sample.project_id == project_id)
    
    samples = query.offset(skip).limit(limit).all()
    return [format_sample_response(sample) for sample in samples]

@router.get("/{sample_id}/details")
async def get_sample_details(
    sample_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed sample information with activity tracking"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if sample is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # Get all activities for this sample, ordered by creation date
    activities = db.query(SampleActivity).filter(
        SampleActivity.sample_id == sample_id
    ).order_by(SampleActivity.created_at.desc()).all()
    
    # Format activities
    formatted_activities = []
    for activity in activities:
        try:
            activity_data = json.loads(activity.activity_data) if activity.activity_data else {}
        except (json.JSONDecodeError, TypeError):
            activity_data = {}
        
        formatted_activities.append({
            "id": activity.id,
            "activity_type": activity.activity_type,
            "description": activity.description or "",
            "activity_data": activity_data,
            "user_name": activity.user.full_name if activity.user else "System",
            "user_email": activity.user.email if activity.user else None,
            "created_at": activity.created_at.isoformat() if activity.created_at else None,
        })
    
    # Format sample response with additional details
    sample_data = format_sample_response(sample)
    sample_data["collected_by"] = None
    sample_data["collected_at"] = sample.created_at.isoformat() if sample.created_at else None
    
    # Find collection activity
    for activity in activities:
        if activity.activity_type == "created":
            sample_data["collected_by"] = activity.user.full_name if activity.user else "System"
            sample_data["collected_at"] = activity.created_at.isoformat() if activity.created_at else None
            break
    
    return {
        "sample": sample_data,
        "activities": formatted_activities,
    }

@router.get("/{sample_id}", response_model=SampleResponse)
async def get_sample(
    sample_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific sample"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if sample is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    return format_sample_response(sample)

@router.post("/", response_model=SampleResponse, status_code=status.HTTP_201_CREATED)
async def create_sample(
    sample: SampleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new sample"""
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == sample.customer_id).first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Verify project if provided
    if sample.project_id:
        project = db.query(Project).filter(Project.id == sample.project_id).first()
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify sample type
    sample_type = db.query(SampleType).filter(SampleType.id == sample.sample_type_id).first()
    if sample_type is None:
        raise HTTPException(status_code=404, detail="Sample type not found")
    
    # Generate unique sample ID
    sample_id = generate_sample_id(db)
    
    # Create sample
    sample_data = sample.model_dump(exclude={'department_ids', 'test_type_ids'})
    sample_data['sample_id'] = sample_id
    
    db_sample = Sample(**sample_data)
    db.add(db_sample)
    db.flush()  # Flush to get the ID
    
    # Add departments
    if sample.department_ids:
        departments = db.query(Department).filter(Department.id.in_(sample.department_ids)).all()
        db_sample.departments = departments
    
    # Add test types (only from selected departments)
    if sample.test_type_ids:
        test_types = db.query(TestType).filter(TestType.id.in_(sample.test_type_ids)).all()
        db_sample.test_types = test_types
    
    # Create activity log entry for sample creation
    activity = SampleActivity(
        sample_id=db_sample.id,
        user_id=current_user.id,
        activity_type="created",
        description=f"Sample created by {current_user.full_name}",
        activity_data=json.dumps({
            "sample_id": sample_id,
            "customer_id": sample.customer_id,
            "project_id": sample.project_id,
            "sample_type_id": sample.sample_type_id,
        })
    )
    db.add(activity)
    
    db.commit()
    db.refresh(db_sample)
    
    # Send email notification to customer
    if customer.email:
        from datetime import datetime
        from services.email_service import send_sample_collection_email
        
        # Format collection timestamp
        collected_at = datetime.now().strftime("%B %d, %Y at %I:%M %p")
        
        # Send email (non-blocking - don't fail sample creation if email fails)
        try:
            send_sample_collection_email(
                to_email=customer.email,
                customer_name=customer.full_name,
                sample_id=sample_id,
                sample_name=db_sample.name,
                collected_by=current_user.full_name,
                collected_at=collected_at,
                db=db
            )
        except Exception as e:
            # Log error but don't fail the sample creation
            print(f"Failed to send sample collection email: {e}")
    
    return format_sample_response(db_sample)

@router.put("/{sample_id}", response_model=SampleResponse)
async def update_sample(
    sample_id: int,
    sample: SampleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a sample"""
    db_sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if db_sample is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    update_data = sample.model_dump(exclude_unset=True, exclude={'department_ids', 'test_type_ids'})
    for field, value in update_data.items():
        setattr(db_sample, field, value)
    
    # Update departments if provided
    if sample.department_ids is not None:
        departments = db.query(Department).filter(Department.id.in_(sample.department_ids)).all()
        db_sample.departments = departments
    
    # Update test types if provided
    if sample.test_type_ids is not None:
        test_types = db.query(TestType).filter(TestType.id.in_(sample.test_type_ids)).all()
        db_sample.test_types = test_types
    
    # Create activity log entry for sample update
    changes = []
    if sample.status and sample.status != db_sample.status:
        changes.append(f"Status changed from {db_sample.status} to {sample.status}")
    
    if changes:
        activity = SampleActivity(
            sample_id=db_sample.id,
            user_id=current_user.id,
            activity_type="updated",
            description=f"Sample updated by {current_user.full_name}. " + "; ".join(changes),
            activity_data=json.dumps({
                "changes": changes,
                "updated_fields": list(sample.model_dump(exclude_unset=True).keys()),
            })
        )
        db.add(activity)
    
    db.commit()
    db.refresh(db_sample)
    
    return format_sample_response(db_sample)

@router.delete("/{sample_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sample(
    sample_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a sample"""
    db_sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if db_sample is None:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    db.delete(db_sample)
    db.commit()
    return None

def format_sample_response(sample: Sample) -> dict:
    """Format sample response with related data"""
    return {
        "id": sample.id,
        "sample_id": sample.sample_id,
        "customer_id": sample.customer_id,
        "project_id": sample.project_id,
        "sample_type_id": sample.sample_type_id,
        "name": sample.name,
        "volume": sample.volume,
        "conditions": sample.conditions,
        "notes": sample.notes,
        "is_batch": sample.is_batch,
        "batch_size": sample.batch_size,
        "status": sample.status,
        "created_at": sample.created_at,
        "updated_at": sample.updated_at,
        "customer_name": sample.customer.full_name if sample.customer else "",
        "customer_email": sample.customer.email if sample.customer else None,
        "customer_phone": sample.customer.phone if sample.customer else None,
        "project_name": sample.project.name if sample.project else None,
        "sample_type_name": sample.sample_type.name if sample.sample_type else "",
        "department_names": [dept.name for dept in sample.departments],
        "test_type_names": [test.name for test in sample.test_types],
    }

