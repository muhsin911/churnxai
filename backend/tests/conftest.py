"""Isolated SQLite fixtures for HTTP/API tests."""
from collections.abc import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.models import User
from app.db.session import get_db
from app.main import app
from app.security import create_session_token, hash_password

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


def override_get_db() -> Generator[Session, None, None]:
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def database_seed() -> Generator[dict[str, User], None, None]:
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    with TestSessionLocal() as session:
        users = {
            role: User(
                username=f"{role}_test",
                password_hash=hash_password("testing-password-123"),
                role=role,
            )
            for role in ("staff", "manager", "professor")
        }
        session.add_all(users.values())
        session.commit()
        for user in users.values():
            session.refresh(user)
    yield users


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    test_client = TestClient(app)
    yield test_client
    test_client.close()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    with TestSessionLocal() as session:
        yield session


@pytest.fixture
def authenticate():
    def set_session(client: TestClient, user: User) -> None:
        client.cookies.set(
            "churnxai_session",
            create_session_token(user),
            path="/api/v1",
        )

    return set_session
