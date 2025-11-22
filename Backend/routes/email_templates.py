from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.email_template import EmailTemplate
from models.user import User
from schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse
from routes.auth import get_current_user
from routes.settings import require_lab_admin_or_manager

router = APIRouter(prefix="/api/email-templates", tags=["email-templates"])

@router.get("/", response_model=List[EmailTemplateResponse])
async def get_email_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Get all email templates"""
    templates = db.query(EmailTemplate).all()
    return templates

@router.get("/{template_name}", response_model=EmailTemplateResponse)
async def get_email_template(
    template_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Get a specific email template by name"""
    template = db.query(EmailTemplate).filter(EmailTemplate.name == template_name).first()
    if template is None:
        raise HTTPException(status_code=404, detail="Email template not found")
    return template

@router.post("/", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_email_template(
    template: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Create a new email template"""
    # Check if template with this name already exists
    existing = db.query(EmailTemplate).filter(EmailTemplate.name == template.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email template with this name already exists")
    
    db_template = EmailTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.put("/{template_name}", response_model=EmailTemplateResponse)
async def update_email_template(
    template_name: str,
    template: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Update an email template"""
    db_template = db.query(EmailTemplate).filter(EmailTemplate.name == template_name).first()
    if db_template is None:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    update_data = template.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_template, field, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template

