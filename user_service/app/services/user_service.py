from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime
from app.db.database import users_collection
from app.models.user import UserCreate, UserResponse, PublicUserResponse, UsernameUpdate, PasswordUpdate
from app.utils.security import get_password_hash, verify_password

class UserService:
    @staticmethod
    def create_user(user_data: UserCreate) -> UserResponse:
        """Create a new user"""
        # Check for existing email
        if users_collection.find_one({"email": user_data.email}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check for existing username
        if users_collection.find_one({"username": user_data.username}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Create new user
        user = {
            "email": user_data.email,
            "username": user_data.username,
            "password": get_password_hash(user_data.password),
            "account_creation_date": datetime.now(),
            "last_login": None,
            "failed_login_attempts": 0,
            "is_locked": False
        }
        
        result = users_collection.insert_one(user)
        user_id = str(result.inserted_id)
    
        return UserResponse(
            id=user_id,
            email=user_data.email,
            username=user_data.username,
            account_creation_date=user["account_creation_date"],
            last_login=None,
            failed_login_attempts=0,
            is_locked=False
        )
    
    # ---------------------------
    # Authentication-related logic
    # ---------------------------

    @staticmethod
    def get_user_by_credentials(username_or_email: str) -> dict:
        """Get user by username or email"""
        user = users_collection.find_one({
            "$or": [
                {"username": username_or_email},
                {"email": username_or_email}
            ]
        })
        return user

    @staticmethod
    def update_login_status(user_id: str) -> None:
        """Update user's last login and reset failed attempts"""
        users_collection.update_one(
            {"_id": user_id},
            {"$set": {"last_login": datetime.now(), "failed_login_attempts": 0}}
        )

    @staticmethod
    def increment_failed_login(user_id: str) -> None:
        """Increment failed login attempts"""
        users_collection.update_one(
            {"_id": user_id},
            {"$inc": {"failed_login_attempts": 1}}
        )


    # ---------------------------
    # Account lookup and security
    # ---------------------------

    @staticmethod
    def get_user_by_id(user_id: str) -> dict:
        try:
            return users_collection.find_one({"_id": ObjectId(user_id)})
        except Exception:  # Invalid ObjectId format
            return None  # Or raise HTTPException

    @staticmethod
    def get_public_user_data(user_id: str) -> PublicUserResponse:
        """Get public user data (for other services)"""
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)}, {"username": 1})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        return PublicUserResponse(
            user_id=str(user["_id"]),
            username=user["username"]
        )
    
    @staticmethod
    def lock_user_account(user_id: str) -> None:
        """Lock user account"""
        users_collection.update_one(
            {"_id": user_id},
            {"$set": {"is_locked": True}}
        )
        
    # ---------------------------
    # Async update operations
    # ---------------------------

    @staticmethod
    async def update_username(users_collection, user_id: str, update_data: UsernameUpdate):
        # Move your existing update_user_username logic here
        if not update_data.new_username:
            raise HTTPException(status_code=400, detail="New username is required")
        
        result = await users_collection.update_one(
            {"_id": user_id},
            {"$set": {"username": update_data.new_username}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found or username unchanged")
        
        return {"message": "Username updated successfully"}

    @staticmethod
    async def update_password(users_collection, user_id: str, update_data: PasswordUpdate):
        # Move your existing update_user_password logic here
        # Include validation for current password matching
        user = await users_collection.find_one({"_id": user_id})

        if not user or user["password"] != update_data.current_password:  # Use proper hashing!
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        hashed_password = get_password_hash(update_data.new_password)
        
        result = await users_collection.update_one(
            {"_id": user_id},
            {"$set": {"password": hashed_password}}  # Hash the new password!
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Password updated successfully"}