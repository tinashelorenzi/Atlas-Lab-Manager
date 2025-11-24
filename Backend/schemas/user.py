from pydantic import BaseModel, EmailStr
from datetime import datetime
from models.user import UserType

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    user_type: UserType

class UserCreate(UserBase):
    # Password is auto-generated, not required from client
    pass

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    needs_password_reset: bool
    created_at: datetime
    updated_at: datetime
    is_impersonated: bool = False  # Whether this user is being impersonated
    impersonated_by: str | None = None  # Email of the super admin doing the impersonation
    
    class Config:
        from_attributes = True

class PasswordReset(BaseModel):
    new_password: str
    confirm_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

