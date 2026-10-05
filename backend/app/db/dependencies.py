"""Role-aware authentication and database dependencies."""
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from enum import StrEnum
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User
from app.db.session import get_db


class UserRole(StrEnum):
    """Roles supported by the project."""

    STAFF = "staff"
    MANAGER = "manager"
    PROFESSOR = "professor"


DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(request: Request, db: DbSession) -> User:
    """Validate the HttpOnly session cookie and load the current account."""
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sign in to use this feature.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise unauthorized
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = UUID(payload["sub"])
    except (InvalidTokenError, KeyError, TypeError, ValueError):
        raise unauthorized from None

    user = db.get(User, user_id)
    if (
        user is None
        or not user.is_active
        or payload.get("session_version", 0) != user.session_version
    ):
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole) -> Callable[..., User]:
    """Build a dependency that accepts only the specified active roles."""
    permitted = frozenset(roles)

    def check_role(user: CurrentUser) -> User:
        if user.role not in permitted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account does not have permission to use this feature.",
            )
        return user

    return check_role


def session_expiry(hours: int | None = None) -> datetime:
    """Return a timezone-aware session expiry timestamp."""
    duration = settings.AUTH_SESSION_HOURS if hours is None else hours
    return datetime.now(timezone.utc) + timedelta(hours=duration)
