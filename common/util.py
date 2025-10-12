import os
from dotenv import load_dotenv

def get_env(key: str, default=None):
    load_dotenv()
    value = os.getenv(key, default)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value
