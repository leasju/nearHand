import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

load_dotenv()

PASSWORD_HASH = PasswordHash.recommended()
BEARER = HTTPBearer(auto_error=False)
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-development-secret")
TOKEN_EXPIRE_HOURS = 8


def hash_password(password: str) -> str:
    return PASSWORD_HASH.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return PASSWORD_HASH.verify(password, password_hash)


def create_access_token(admin_id: int) -> str:
    return create_role_access_token(admin_id, "admin")


def create_role_access_token(subject_id: int, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": str(subject_id), "role": role, "exp": expires_at},
        SECRET_KEY,
        algorithm="HS256",
    )


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
    db: Session = Depends(get_db),
):
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        admin_id = int(payload["sub"])
        if payload.get("role") != "admin":
            raise unauthorized
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise unauthorized

    admin = db.execute(
        text("SELECT id, nome, email FROM admin WHERE id = :admin_id"),
        {"admin_id": admin_id},
    ).mappings().first()

    if admin is None:
        raise unauthorized

    return admin


def get_current_client_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
    db: Session = Depends(get_db),
) -> int:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Client authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        account_id = int(payload["sub"])
        if payload.get("role") != "cliente":
            raise unauthorized
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise unauthorized

    if db.execute(text("SELECT id FROM cliente WHERE id = :id"), {"id": account_id}).first() is None:
        raise unauthorized

    return account_id


def get_current_provider_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(BEARER),
    db: Session = Depends(get_db),
) -> int:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Provider authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        account_id = int(payload["sub"])
        if payload.get("role") != "prestador":
            raise unauthorized
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise unauthorized

    if db.execute(text("SELECT id FROM prestador WHERE id = :id"), {"id": account_id}).first() is None:
        raise unauthorized

    return account_id
