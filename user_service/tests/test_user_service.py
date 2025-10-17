import pytest
from app.services.user_service import UserService
from app.models.user import UserCreate
from app.db.database import users_collection

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
    assert user.failed_login_attempts == 0

def test_duplicate_email():
    user_data = UserCreate(
        email="test@example.com",
        username="tester1",
        password="Password12!"
    )
    UserService.create_user(user_data)

    with pytest.raises(Exception):
        UserService.create_user(user_data)
