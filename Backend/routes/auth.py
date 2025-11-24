from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
from models.user import User
from models.integration import Integration
from models.login_history import LoginHistory
from schemas.user import UserLogin, Token, UserResponse, PasswordReset
from auth import verify_password, create_access_token, decode_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
import json
import requests

router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Get the current authenticated user (handles impersonation)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    # Check for impersonation
    impersonated_user_id = payload.get("impersonated_user_id")
    if impersonated_user_id:
        # User is being impersonated - return the impersonated user
        user = db.query(User).filter(User.id == impersonated_user_id).first()
        if user is None:
            raise credentials_exception
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
        # Store impersonation info in user object for reference
        user._is_impersonated = True
        user._impersonated_by = email  # Super admin email
        return user
    
    # Normal authentication - return the actual user
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def verify_turnstile_token(token: str, secret_key: str) -> bool:
    """Verify Turnstile token with Cloudflare"""
    try:
        response = requests.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            data={
                'secret': secret_key,
                'response': token,
            },
            timeout=5
        )
        result = response.json()
        return result.get('success', False)
    except Exception as e:
        print(f"Turnstile verification error: {e}")
        return False

def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    if "x-forwarded-for" in request.headers:
        return request.headers["x-forwarded-for"].split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"

def get_user_agent(request: Request) -> str:
    """Get user agent from request"""
    return request.headers.get("user-agent", "unknown")

@router.post("/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    turnstile_token: str = Form(None),
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT token"""
    email = form_data.username
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Check if Turnstile is enabled and verify token
    turnstile_integration = db.query(Integration).filter(Integration.name == "cloudflare_turnstile").first()
    if turnstile_integration and turnstile_integration.enabled:
        if not turnstile_token:
            # Log failed login attempt
            login_log = LoginHistory(
                email=email,
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason="Turnstile verification required"
            )
            db.add(login_log)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Turnstile verification required"
            )
        
        # Get secret key from config
        config = {}
        if turnstile_integration.config:
            try:
                config = json.loads(turnstile_integration.config) if isinstance(turnstile_integration.config, str) else turnstile_integration.config
            except (json.JSONDecodeError, TypeError):
                pass
        
        secret_key = config.get('secret_key', '')
        if not secret_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Turnstile secret key not configured"
            )
        
        # Verify token
        if not verify_turnstile_token(turnstile_token, secret_key):
            # Log failed login attempt
            login_log = LoginHistory(
                email=email,
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason="Turnstile verification failed"
            )
            db.add(login_log)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Turnstile verification failed"
            )
    
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Log failed login attempt
        login_log = LoginHistory(
            email=email,
            success=False,
            ip_address=ip_address,
            user_agent=user_agent,
            failure_reason="Incorrect email or password"
        )
        db.add(login_log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        # Log failed login attempt
        login_log = LoginHistory(
            email=email,
            success=False,
            ip_address=ip_address,
            user_agent=user_agent,
            failure_reason="Inactive user"
        )
        db.add(login_log)
        db.commit()
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Log successful login
    login_log = LoginHistory(
        user_id=user.id,
        email=email,
        success=True,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(login_log)
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_type": user.user_type.value},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "needs_password_reset": user.needs_password_reset
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    # Check if user is being impersonated
    payload = decode_access_token(token)
    is_impersonated = False
    impersonated_by = None
    
    if payload and payload.get("impersonated_user_id"):
        is_impersonated = True
        impersonated_by = payload.get("sub")  # Super admin email
    
    # Create response with impersonation info
    user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "user_type": current_user.user_type,
        "is_active": current_user.is_active,
        "needs_password_reset": current_user.needs_password_reset,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
        "is_impersonated": is_impersonated,
        "impersonated_by": impersonated_by
    }
    return UserResponse(**user_dict)

@router.post("/reset-password")
async def reset_password(
    password_data: PasswordReset,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset password for user (required on first login)"""
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    if len(password_data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.needs_password_reset = False
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Password reset successfully"}

