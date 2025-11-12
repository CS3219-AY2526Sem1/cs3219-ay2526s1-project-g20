# M1 User Service

User management microservice for PeerPrep — built with FastAPI + Motor (async MongoDB driver).  
Provides user registration, authentication (JWT), profile endpoints, and public user lookup.

---

## Features

- User registration (email, username, password)
- Token-based authentication (JWT)
- Profile endpoints (get profile, update username, change password)
- Public user lookup endpoint
- MongoDB indexes for unique `email` and `username`
- Unit tests (minimal)

---

## Quick start (local)

### Prerequisites
- Python 3.11+
- MongoDB (local or hosted)
- `pip` or `poetry`
- (Optional) Docker & docker-compose

### Environment variables

Create a `.env` file at project root with at minimum:
MONGO_URI=mongodb://localhost:27017
DB_NAME=user_service_db
SECRET_KEY=<a strong random secret, 32+ chars>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

### Install & run (venv)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r user_service/requirements.txt

# start app (uvicorn)
uvicorn app.main:app --reload --port 8000
```


## API

Base: http://localhost:8000 (or where uvicorn serves)

POST /register — Register new user. Body: UserCreate model (email, username, password).

POST /login — OAuth2 password flow (username/email + password). Returns JWT access_token.

GET /profile — Authenticated: returns user profile.

PATCH /profile/username — Authenticated: change username.

PATCH /profile/password — Authenticated: update password (requires current password).

GET /api/users/{user_id}/public?username=... — Public user data endpoint (for other services).

Request/response models are available in app/models.

## Architecture

High-level architecture:

FastAPI application exposing REST endpoints (app/api/endpoints)

Services layer for business logic (app/services/*.py)

Utilities for security (password hashing, JWT) (app/utils/security.py)

MongoDB with motor (async) — users collection

Startup creates unique indexes for email and username