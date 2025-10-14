from fastapi import APIRouter, Depends
from app.models.user import UserResponse
from app.services.auth_service import AuthService
from typing import Dict, Any

router = APIRouter()

@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: Dict[str, Any] = Depends(AuthService.get_current_user)):
    """Get current user's profile"""
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        username=current_user["username"],
        account_creation_date=current_user["account_creation_date"],
        last_login=current_user["last_login"]
    )
    