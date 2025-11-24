from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
import os
from database import get_db
from models.user import User, UserType
from models.organization import Organization
from models.integration import Integration
from schemas.organization import OrganizationResponse, OrganizationUpdate
from schemas.integration import IntegrationResponse, IntegrationUpdate
from schemas.user import UserResponse, UserCreate
from routes.auth import get_current_user
from auth import get_password_hash
from utils.password_generator import generate_temp_password
from services.email_service import send_welcome_email

router = APIRouter(prefix="/api/settings", tags=["settings"])

def require_lab_admin_or_manager(current_user: User = Depends(get_current_user)):
    """Check if user is lab administrator or lab manager"""
    if current_user.user_type not in [UserType.LAB_ADMINISTRATOR, UserType.LAB_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Lab Administrator or Lab Manager required."
        )
    return current_user

# Account endpoints (all authenticated users)
@router.get("/account", response_model=UserResponse)
async def get_account(current_user: User = Depends(get_current_user)):
    """Get current user's account information"""
    return current_user

# Organization endpoints (lab admin and manager only)
@router.get("/organization", response_model=OrganizationResponse)
async def get_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Get organization information"""
    org = db.query(Organization).first()
    if org is None:
        # Create default organization if none exists
        org = Organization(name="Atlas Lab")
        db.add(org)
        db.commit()
        db.refresh(org)
    return org

@router.put("/organization", response_model=OrganizationResponse)
async def update_organization(
    org_data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Update organization information"""
    org = db.query(Organization).first()
    if org is None:
        org = Organization(name="Atlas Lab")
        db.add(org)
        db.commit()
        db.refresh(org)
    
    update_data = org_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)
    
    db.commit()
    db.refresh(org)
    return org

# Integration endpoints (lab admin and manager only)
@router.get("/integrations", response_model=List[IntegrationResponse])
async def get_integrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Get all integrations"""
    integrations = db.query(Integration).all()
    result = []
    for integration in integrations:
        result.append({
            "id": integration.id,
            "name": integration.name,
            "enabled": integration.enabled,
            "config": json.loads(integration.config) if integration.config else None,
            "created_at": integration.created_at,
            "updated_at": integration.updated_at,
        })
    return result

@router.get("/integrations/public/turnstile")
async def get_turnstile_public_config(db: Session = Depends(get_db)):
    """Public endpoint to get Turnstile site key (for login page)"""
    turnstile = db.query(Integration).filter(Integration.name == "cloudflare_turnstile").first()
    if not turnstile or not turnstile.enabled:
        return {"enabled": False, "site_key": None}
    
    config = {}
    if turnstile.config:
        try:
            config = json.loads(turnstile.config) if isinstance(turnstile.config, str) else turnstile.config
        except (json.JSONDecodeError, TypeError):
            pass
    
    return {
        "enabled": True,
        "site_key": config.get("site_key", "")
    }

@router.get("/integrations/{integration_name}", response_model=IntegrationResponse)
async def get_integration(
    integration_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Get a specific integration"""
    integration = db.query(Integration).filter(Integration.name == integration_name).first()
    if integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {
        "id": integration.id,
        "name": integration.name,
        "enabled": integration.enabled,
        "config": json.loads(integration.config) if integration.config else None,
        "created_at": integration.created_at,
        "updated_at": integration.updated_at,
    }

@router.put("/integrations/{integration_name}", response_model=IntegrationResponse)
async def update_integration(
    integration_name: str,
    integration_data: IntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Update an integration"""
    integration = db.query(Integration).filter(Integration.name == integration_name).first()
    if integration is None:
        # Create integration if it doesn't exist
        integration = Integration(name=integration_name, enabled=True)  # Enable by default when config is set
        db.add(integration)
        db.commit()
        db.refresh(integration)
    
    update_data = integration_data.model_dump(exclude_unset=True)
    if 'config' in update_data and isinstance(update_data['config'], dict):
        update_data['config'] = json.dumps(update_data['config'])
        # Auto-enable if config is being set
        if 'enabled' not in update_data:
            update_data['enabled'] = True
    elif 'config' in update_data and update_data['config'] is None:
        update_data['config'] = None
    
    for field, value in update_data.items():
        setattr(integration, field, value)
    
    db.commit()
    db.refresh(integration)
    
    # Parse config back to dict for response
    response_data = {
        "id": integration.id,
        "name": integration.name,
        "enabled": integration.enabled,
        "config": json.loads(integration.config) if integration.config else None,
        "created_at": integration.created_at,
        "updated_at": integration.updated_at,
    }
    
    return response_data

# User Management endpoints (lab admin and manager only)
@router.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Get all users"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Create a new user (cannot create lab administrator). Generates temp password and sends email."""
    if user.user_type == UserType.LAB_ADMINISTRATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create Lab Administrator user"
        )
    
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate temporary password
    temp_password = generate_temp_password()
    hashed_password = get_password_hash(temp_password)
    
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        user_type=user.user_type,
        needs_password_reset=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Send welcome email with temporary password
    login_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    email_sent = send_welcome_email(
        to_email=user.email,
        full_name=user.full_name,
        temp_password=temp_password,
        login_url=login_url,
        db=db
    )
    
    if not email_sent:
        # Log warning but don't fail the user creation
        print(f"Warning: Failed to send welcome email to {user.email}")
    
    return db_user

@router.put("/users/{user_id}/suspend", response_model=UserResponse)
async def suspend_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Suspend a user"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.user_type == UserType.LAB_ADMINISTRATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot suspend Lab Administrator"
        )
    
    db_user.is_active = False
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/users/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Activate a user"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.is_active = True
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Delete a user"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.user_type == UserType.LAB_ADMINISTRATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete Lab Administrator"
        )
    
    db.delete(db_user)
    db.commit()
    return None

