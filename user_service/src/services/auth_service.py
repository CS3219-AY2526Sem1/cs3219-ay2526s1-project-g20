from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from datetime import timedelta
from app.models.token import TokenData
from app.services.user_service import UserService
from app.utils.security import verify_password, create_access_token, decode_access_token
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthService:
    @staticmethod
    async def authenticate_user(username_or_email: str, password: str) -> dict:
        """Authenticate a user by username/email and password"""
        user = await UserService.get_user_by_credentials(username_or_email)
        
        # Check if user exists and password is correct
        if not user or not verify_password(password, user["password"]):
            # Increment failed login attempts if user exists
            if user:
                await UserService.increment_failed_login(user["_id"])
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if account is locked
        if user.get("is_locked", False):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is locked. Please reset your password via email.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user

    @staticmethod
    def create_user_token(user_id: str) -> str:
        """Create an access token for a user"""
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        return create_access_token(
            data={"sub": str(user_id)}, expires_delta=access_token_expires
        )

    @staticmethod
    async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
        """Get the current authenticated user"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        payload = decode_access_token(token)
        if payload is None:
            raise credentials_exception
            
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        user = await UserService.get_user_by_id(user_id)
        if user is None:
            raise credentials_exception
            
        return user
    