from motor.motor_asyncio import AsyncIOMotorClient  # Async client
from pymongo.collection import Collection
from app.config import MONGO_URI, DATABASE_NAME, USERS_COLLECTION

# Initialize MongoDB client
client = AsyncIOMotorClient(MONGO_URI)

# Get database
db = client[DATABASE_NAME]

# Get collections
users_collection = db[USERS_COLLECTION]

def get_users_collection() -> Collection:
    """Return the users collection (for use in other parts of the app)"""
    return users_collection

# Create indexes for unique fields
async def create_indexes():
    """Create necessary indexes for the database collections"""
    # Unique index on email
    await users_collection.create_index("email", unique=True)
    # Unique index on username
    await users_collection.create_index("username", unique=True)
