from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional
import re
from app.config import PASSWORD_MIN_LENGTH

def validate_username_format(v: str) -> str:
    if len(v) < 3 or len(v) > 50:
        raise ValueError('Username must be 3-50 characters')
    if not re.match(r'^[a-zA-Z0-9_]+$', v):
        raise ValueError('Username can only contain letters, numbers, and underscores')
    return v

def validate_password_strength(v: str) -> str:
    if len(v) < PASSWORD_MIN_LENGTH:
        raise ValueError(f'Password must be at least {PASSWORD_MIN_LENGTH} characters')
    if not re.search(r'[A-Z]', v):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', v):
        raise ValueError('Password must contain at least one lowercase letter')
    if not re.search(r'[0-9]', v):
        raise ValueError('Password must contain at least one number')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
        raise ValueError('Password must contain at least one special character')
    return v

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator('username')
    def validate_username(cls, v):
        return validate_username_format(v)

    @field_validator('password')
    def validate_password(cls, v):
        return validate_password_strength(v)
    
class UserResponse(BaseModel):
    id: str
    email: EmailStr
    username: str
    account_creation_date: datetime
    last_login: Optional[datetime] = None

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class PublicUserResponse(BaseModel):
    user_id: str
    username: str

class UsernameUpdate(BaseModel):
    """Model for username update requests"""
    new_username: str

    @field_validator('new_username')
    def validate_username(cls, v):
        return validate_username_format(v)

class PasswordUpdate(BaseModel):
    """Model for password update requests"""
    current_password: str
    new_password: str

    @field_validator('new_password')
    def validate_password(cls, v):
        return validate_password_strength(v)