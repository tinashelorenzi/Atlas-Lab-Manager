from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from PIL import Image
import os
import uuid
import io
from database import get_db
from models.organization import Organization
from models.user import User, UserType
from schemas.organization import OrganizationResponse, OrganizationUpdate
from routes.auth import get_current_user

router = APIRouter(prefix="/api/organization", tags=["organization"])

UPLOAD_DIR = "uploads/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def require_lab_admin_or_manager(current_user: User = Depends(get_current_user)):
    """Check if user is lab administrator or lab manager"""
    if current_user.user_type not in [UserType.LAB_ADMINISTRATOR, UserType.LAB_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Lab Administrator or Lab Manager required."
        )
    return current_user

@router.post("/logo", response_model=OrganizationResponse)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lab_admin_or_manager)
):
    """Upload organization logo"""
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    contents = await file.read()
    
    # Check file size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB")
    
    # Process image with Pillow
    try:
        image = Image.open(io.BytesIO(contents))
        # Convert to RGB if necessary
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Resize if too large (max 512x512)
        max_size = (512, 512)
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}{file_ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        # Save processed image
        image.save(filepath, "JPEG", quality=85, optimize=True)
        
        # Get or create organization
        org = db.query(Organization).first()
        if org is None:
            org = Organization(name="Atlas Lab")
            db.add(org)
            db.commit()
            db.refresh(org)
        
        # Delete old logo if exists
        if org.logo_url:
            old_path = org.logo_url.replace("/uploads/logos/", UPLOAD_DIR + "/")
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except:
                    pass
        
        # Update logo URL
        org.logo_url = f"/uploads/logos/{filename}"
        db.commit()
        db.refresh(org)
        
        return org
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")

