from fastapi import APIRouter
from app.api.endpoints import auth, profile, users

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, tags=["authentication"])
api_router.include_router(profile.router, tags=["profile"])
api_router.include_router(users.router, tags=["users"])
