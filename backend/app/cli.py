"""Administrative commands for provisioning application accounts."""
import argparse
import getpass
import re
import sys

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import User
from app.db.session import SessionLocal
from app.db.dependencies import UserRole
from app.security import hash_password

USERNAME_PATTERN = re.compile(r"^[a-z0-9_.-]{3,64}$")


def create_user(username: str, role: str) -> int:
    """Prompt for a password and create one account without exposing its secret."""
    normalized_username = username.strip().lower()
    if USERNAME_PATTERN.fullmatch(normalized_username) is None:
        print("Username must be 3-64 characters: letters, numbers, dot, underscore, or hyphen.", file=sys.stderr)
        return 2

    password = getpass.getpass("Password (at least 12 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if len(password) < 12:
        print("Password must contain at least 12 characters.", file=sys.stderr)
        return 2
    if password != confirmation:
        print("Passwords did not match.", file=sys.stderr)
        return 2

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.username == normalized_username))
        if existing is not None:
            print(f"Account '{normalized_username}' already exists.", file=sys.stderr)
            return 1
        db.add(User(username=normalized_username, password_hash=hash_password(password), role=role))
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            print("Account creation failed; check the database and username.", file=sys.stderr)
            raise
    print(f"Created {role} account '{normalized_username}'.")
    return 0


def main() -> None:
    """Parse and execute the account provisioning command."""
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-user", help="Create a staff, manager, or professor login.")
    create.add_argument("--username", required=True)
    create.add_argument("--role", choices=[role.value for role in UserRole], required=True)
    args = parser.parse_args()
    raise SystemExit(create_user(args.username, args.role))


if __name__ == "__main__":
    main()
