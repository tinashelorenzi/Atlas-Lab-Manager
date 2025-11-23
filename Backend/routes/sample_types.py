from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.sample_type import SampleType
from models.user import User
from schemas.sample_type import SampleTypeCreate, SampleTypeUpdate, SampleTypeResponse
from routes.auth import get_current_user
from routes.settings import require_lab_admin_or_manager

router = APIRouter(prefix="/api/sample-types", tags=["sample-types"])

@router.get("/", response_model=List[SampleTypeResponse])
async def get_sample_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all sample types"""
    sample_types = db.query(SampleType).filter(SampleType.is_active == True).all()
    return sample_types

@router.post("/", response_model=SampleTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_sample_type(
    sample_type: SampleTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Create a new sample type"""
    # Check if sample type with same name exists
    existing = db.query(SampleType).filter(SampleType.name == sample_type.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Sample type with this name already exists")
    
    db_sample_type = SampleType(**sample_type.model_dump())
    db.add(db_sample_type)
    db.commit()
    db.refresh(db_sample_type)
    return db_sample_type

@router.put("/{sample_type_id}", response_model=SampleTypeResponse)
async def update_sample_type(
    sample_type_id: int,
    sample_type: SampleTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Update a sample type"""
    db_sample_type = db.query(SampleType).filter(SampleType.id == sample_type_id).first()
    if db_sample_type is None:
        raise HTTPException(status_code=404, detail="Sample type not found")
    
    update_data = sample_type.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_sample_type, field, value)
    
    db.commit()
    db.refresh(db_sample_type)
    return db_sample_type

@router.delete("/{sample_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sample_type(
    sample_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Delete a sample type (soft delete)"""
    db_sample_type = db.query(SampleType).filter(SampleType.id == sample_type_id).first()
    if db_sample_type is None:
        raise HTTPException(status_code=404, detail="Sample type not found")
    
    db_sample_type.is_active = False
    db.commit()
    return None

