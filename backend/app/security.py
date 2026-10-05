"""Password hashing and short-lived signed browser sessions."""
from datetime import datetime, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings
from app.db.dependencies import session_expiry
from app.db.models import User

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Hash a password with the recommended Argon2id configuration."""
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Compare a plaintext password to its stored Argon2id hash."""
    return password_hasher.verify(password, password_hash)


def create_session_token(user: User) -> str:
    """Create a signed session token tied to this account's current session version."""
    return jwt.encode(
        {
            "sub": str(user.id),
            "session_version": user.session_version,
            "exp": session_expiry(),
            "iat": datetime.now(timezone.utc),
        },
        settings.JWT_SECRET_KEY,
        algorithm="HS256",
    )
