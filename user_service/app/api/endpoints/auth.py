from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import UserCreate, UserResponse, UsernameUpdate, PasswordUpdate
from app.models.token import Token
from app.services.user_service import UserService
from app.services.auth_service import AuthService

from app.db.database import get_users_collection

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """Register a new user"""
    return UserService.create_user(user)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate a user and return an access token"""
    user = AuthService.authenticate_user(form_data.username, form_data.password)
    
    # Update login status
    UserService.update_login_status(user["_id"])
    
    # Create access token
    access_token = AuthService.create_user_token(user["_id"])
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.patch("/username", status_code=status.HTTP_200_OK)
async def update_username(
    update_data: UsernameUpdate,
    current_user: dict = Depends(AuthService.get_current_user),
    users_collection = Depends(get_users_collection)
):
    """Update logged-in user's username via UserService"""
    user_id = str(current_user["_id"])
    return await UserService.update_username(  # Delegate to UserService
        users_collection=users_collection,
        user_id=user_id,
        update_data=update_data
    )

@router.patch("/password", status_code=status.HTTP_200_OK)
async def update_password(
    update_data: PasswordUpdate,
    current_user: dict = Depends(AuthService.get_current_user),
    users_collection = Depends(get_users_collection)
):
    """Update logged-in user's password via UserService"""
    user_id = str(current_user["_id"])
    return await UserService.update_password(  # Delegate to UserService
        users_collection=users_collection,
        user_id=user_id,
        update_data=update_data
    )