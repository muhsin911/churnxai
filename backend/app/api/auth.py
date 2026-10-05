"""Login, logout, and current-user endpoints."""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.db.dependencies import CurrentUser, DbSession, UserRole, require_roles
from app.db.models import User
from app.schemas.auth import (
    CreateUserRequest,
    LoginRequest,
    ManagedUserListResponse,
    ManagedUserResponse,
    UserResponse,
)
from app.security import create_session_token, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])
password_hasher = PasswordHash.recommended()
dummy_password_hash = password_hasher.hash("not-a-real-account-password")
manager_only = require_roles(UserRole.MANAGER)


def _as_utc(value: datetime) -> datetime:
    """Normalize database timestamps, including SQLite's naive test values."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _user_response(user: User) -> UserResponse:
    """Build the public account shape without exposing password metadata."""
    return UserResponse(id=user.id, username=user.username, role=user.role)


@router.post("/login", response_model=UserResponse)
def login(credentials: LoginRequest, response: Response, db: DbSession) -> UserResponse:
    """Verify a provisioned account and issue an HttpOnly session cookie."""
    username = credentials.username.lower()
    user = db.scalar(select(User).where(User.username == username))
    now = datetime.now(timezone.utc)

    if user is None:
        verify_password(credentials.password, dummy_password_hash)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    if user.locked_until is not None and _as_utc(user.locked_until) > now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    if not user.is_active or not verify_password(credentials.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.AUTH_MAX_FAILED_LOGINS:
            user.locked_until = now + timedelta(minutes=settings.AUTH_LOCKOUT_MINUTES)
            user.failed_login_attempts = 0
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    max_age = settings.AUTH_SESSION_HOURS * 60 * 60
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=create_session_token(user),
        max_age=max_age,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="strict",
        path=settings.API_V1_PREFIX,
    )
    return _user_response(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    """Clear the browser's authentication cookie."""
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="strict",
        path=settings.API_V1_PREFIX,
    )


@router.get("/me", response_model=UserResponse)
def current_user(user: CurrentUser) -> UserResponse:
    """Return the currently authenticated account."""
    return _user_response(user)


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    request: CreateUserRequest,
    db: DbSession,
    _manager: User = Depends(manager_only),
) -> UserResponse:
    """Allow managers to provision staff, manager, and professor accounts."""
    username = request.username.lower()
    existing = db.scalar(select(User.id).where(User.username == username))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that username already exists.",
        )

    user = User(
        username=username,
        password_hash=password_hasher.hash(request.password),
        role=request.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that username already exists.",
        ) from exc
    db.refresh(user)
    return _user_response(user)


@router.get("/users", response_model=ManagedUserListResponse)
def list_users(
    db: DbSession,
    _manager: User = Depends(manager_only),
) -> ManagedUserListResponse:
    """List every account and report total and active user counts to managers."""
    users = db.scalars(select(User).order_by(User.created_at.desc(), User.username)).all()
    return ManagedUserListResponse(
        items=[
            ManagedUserResponse(
                id=user.id,
                username=user.username,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
            )
            for user in users
        ],
        total=len(users),
        active_total=sum(user.is_active for user in users),
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: UUID,
    db: DbSession,
    manager: User = Depends(manager_only),
) -> None:
    """Deactivate an account without deleting its prediction audit history."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found.",
        )
    if user.id == manager.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot deactivate your own manager account.",
        )

    if user.role == UserRole.MANAGER.value and user.is_active:
        active_managers = db.scalars(
            select(User)
            .where(User.role == UserRole.MANAGER.value, User.is_active.is_(True))
            .order_by(User.id)
            .with_for_update()
        ).all()
        if len(active_managers) <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The last active manager account cannot be deactivated.",
            )

    user.is_active = False
    db.commit()
