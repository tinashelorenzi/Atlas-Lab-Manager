from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.department import Department
from models.test_type import TestType
from models.user import User
from schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse, TestTypeCreate, TestTypeUpdate, TestTypeResponse
from routes.auth import get_current_user
from routes.settings import require_lab_admin_or_manager

router = APIRouter(prefix="/api/departments", tags=["departments"])

@router.get("/", response_model=List[DepartmentResponse])
async def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all departments with their test types"""
    # Get all departments (including inactive) for admin users
    # Use joinedload to eagerly load test_types to avoid N+1 queries
    from sqlalchemy.orm import joinedload
    departments = db.query(Department).options(joinedload(Department.test_types)).all()
    return departments

@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Create a new department"""
    # Check if department with same name exists
    existing = db.query(Department).filter(Department.name == department.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name already exists")
    
    db_department = Department(**department.model_dump())
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department

@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: int,
    department: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Update a department"""
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if db_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = department.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_department, field, value)
    
    db.commit()
    db.refresh(db_department)
    return db_department

@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Delete a department (soft delete by setting is_active=False)"""
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if db_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    
    db_department.is_active = False
    db.commit()
    return None

# Test Type endpoints
@router.post("/{department_id}/test-types", response_model=TestTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_test_type(
    department_id: int,
    test_type: TestTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Create a new test type for a department"""
    # Verify department exists
    department = db.query(Department).filter(Department.id == department_id).first()
    if department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    
    db_test_type = TestType(department_id=department_id, **test_type.model_dump())
    db.add(db_test_type)
    db.commit()
    db.refresh(db_test_type)
    return db_test_type

@router.put("/{department_id}/test-types/{test_type_id}", response_model=TestTypeResponse)
async def update_test_type(
    department_id: int,
    test_type_id: int,
    test_type: TestTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Update a test type"""
    db_test_type = db.query(TestType).filter(
        TestType.id == test_type_id,
        TestType.department_id == department_id
    ).first()
    if db_test_type is None:
        raise HTTPException(status_code=404, detail="Test type not found")
    
    update_data = test_type.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_test_type, field, value)
    
    db.commit()
    db.refresh(db_test_type)
    return db_test_type

@router.delete("/{department_id}/test-types/{test_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_type(
    department_id: int,
    test_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Delete a test type (soft delete)"""
    db_test_type = db.query(TestType).filter(
        TestType.id == test_type_id,
        TestType.department_id == department_id
    ).first()
    if db_test_type is None:
        raise HTTPException(status_code=404, detail="Test type not found")
    
    db_test_type.is_active = False
    db.commit()
    return None

