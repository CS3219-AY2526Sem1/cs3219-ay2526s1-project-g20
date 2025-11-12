from fastapi import APIRouter
from app.models.user import PublicUserResponse
from app.services.user_service import UserService

router = APIRouter()

@router.get("/api/users/{user_id}/public", response_model=PublicUserResponse)
async def get_public_user_data(username: str):
    """Get public user data (for other services)"""
    return await UserService.get_public_user_data(username)
    