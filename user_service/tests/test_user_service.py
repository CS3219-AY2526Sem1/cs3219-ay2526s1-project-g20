import pytest
from bson import ObjectId
from app.services.user_service import UserService
from app.models.user import UserCreate, UsernameUpdate, PasswordUpdate
from app.db.database import users_collection
from app.utils.security import get_password_hash, verify_password

@pytest.fixture(autouse=True)
def clear_users():
    """Clear users before each test (dangerous in production!)."""
    users_collection.delete_many({})  # Wipes test data
    yield
    users_collection.delete_many({})

def test_create_user():
    user_data = UserCreate(
        email="test@example.com",
        username="tester",
        password="Mypassword123!"
    )

    user = UserService.create_user(user_data)

    assert user.email == "test@example.com"
    assert user.username == "tester"

def test_duplicate_email():
    user_data = UserCreate(
        email="test@example.com",
        username="tester1",
        password="Password12!"
    )
    UserService.create_user(user_data)

    with pytest.raises(Exception):
        UserService.create_user(user_data)

def test_increment_failed_login():
    # Create a test user
    user_data = UserCreate(
        email="fail@example.com",
        username="failtester",
        password="Password123!"
    )
    user = UserService.create_user(user_data)

    # Increment failed login attempts
    user_id = user.id
    UserService.increment_failed_login(ObjectId(user_id))
    updated_user = users_collection.find_one({"_id": ObjectId(user_id)})

    assert updated_user["failed_login_attempts"] == 1

def test_lock_user_account():
    user_data = UserCreate(
        email="lock@example.com",
        username="locktester",
        password="Password123!"
    )
    user = UserService.create_user(user_data)

    UserService.lock_user_account(ObjectId(user.id))
    updated_user = users_collection.find_one({"_id": ObjectId(user.id)})

    assert updated_user["is_locked"] is True

def test_update_username():
    user_data = UserCreate(
        email="rename@example.com",
        username="oldname",
        password="Password123!"
    )
    user = UserService.create_user(user_data)
    user_id = ObjectId(user.id)

    update_data = UsernameUpdate(new_username="newname")
    result = UserService.update_username(users_collection, user_id, update_data)

    updated_user = users_collection.find_one({"_id": user_id})
    assert updated_user["username"] == "newname"
    assert result["message"] == "Username updated successfully"

def test_update_password():
    user_data = UserCreate(
        email="pass@example.com",
        username="changepass",
        password="Password123!"
    )
    user = UserService.create_user(user_data)
    user_id = ObjectId(user.id)

    # Hash the stored password manually to simulate a real record
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": get_password_hash("Password123!")}}
    )

    update_data = PasswordUpdate(
        current_password="Password123!",
        new_password="Newpassword123!"
    )

    result = UserService.update_password(users_collection, user_id, update_data)
    updated_user = users_collection.find_one({"_id": user_id})

    assert verify_password("Newpassword123!", updated_user["password"])
    assert result["message"] == "Password updated successfully"