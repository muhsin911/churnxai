"""Create user accounts and prediction audit records.

Revision ID: 0001_users_predictions
Revises:
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_users_predictions"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)
    op.create_table(
        "prediction_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("model_name", sa.String(length=160), nullable=False),
        sa.Column("model_status", sa.String(length=40), nullable=False),
        sa.Column("churn_probability", sa.Float(), nullable=False),
        sa.Column("churn_risk", sa.String(length=20), nullable=False),
        sa.Column("predicted_class", sa.Boolean(), nullable=False),
        sa.Column("decision_threshold", sa.Float(), nullable=False),
        sa.Column("input_features", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_prediction_records_created_at", "prediction_records", ["created_at"], unique=False)
    op.create_index(
        "ix_prediction_records_owner_created",
        "prediction_records",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_prediction_records_owner_created", table_name="prediction_records")
    op.drop_index("ix_prediction_records_created_at", table_name="prediction_records")
    op.drop_table("prediction_records")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
