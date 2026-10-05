"""Authentication request and response schemas."""
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

Username = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$"),
]


class LoginRequest(BaseModel):
    """Credentials submitted to the login endpoint."""

    username: Username
    password: str = Field(min_length=1, max_length=256)


class CreateUserRequest(BaseModel):
    """New account details accepted from a signed-in manager."""

    username: Username
    password: str = Field(min_length=12, max_length=256)
    role: Literal["staff", "manager", "professor"]


class ResetUserPasswordRequest(BaseModel):
    """Replacement password set by a manager."""

    password: str = Field(min_length=12, max_length=256)


class PermanentDeleteRequest(BaseModel):
    """Choose how the account's prediction history is handled."""

    history_action: Literal["anonymize", "delete"]


class UserResponse(BaseModel):
    """Safe user identity returned to the frontend."""

    id: UUID
    username: str
    role: Literal["staff", "manager", "professor"]


class ManagedUserResponse(BaseModel):
    """Account details visible to managers in the user list."""

    id: UUID
    username: str
    role: Literal["staff", "manager", "professor"]
    is_active: bool
    created_at: datetime


class ManagedUserListResponse(BaseModel):
    """All accounts and counts for the manager dashboard."""

    items: list[ManagedUserResponse]
    total: int
    active_total: int
