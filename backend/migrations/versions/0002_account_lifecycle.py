"""Support session invalidation and anonymized prediction history.

Revision ID: 0002_account_lifecycle
Revises: 0001_users_predictions
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_account_lifecycle"
down_revision: Union[str, None] = "0001_users_predictions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("session_version", sa.Integer(), server_default="0", nullable=False),
    )
    with op.batch_alter_table(
        "prediction_records",
        naming_convention={"fk": "%(table_name)s_%(column_0_name)s_fkey"},
    ) as batch_op:
        batch_op.drop_constraint("prediction_records_user_id_fkey", type_="foreignkey")
        batch_op.alter_column("user_id", existing_type=sa.Uuid(), nullable=True)
        batch_op.create_foreign_key(
            "fk_prediction_records_user_id_users",
            "users",
            ["user_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    op.execute("DELETE FROM prediction_records WHERE user_id IS NULL")
    with op.batch_alter_table(
        "prediction_records",
        naming_convention={"fk": "%(table_name)s_%(column_0_name)s_fkey"},
    ) as batch_op:
        batch_op.drop_constraint("fk_prediction_records_user_id_users", type_="foreignkey")
        batch_op.alter_column("user_id", existing_type=sa.Uuid(), nullable=False)
        batch_op.create_foreign_key(
            "prediction_records_user_id_fkey",
            "users",
            ["user_id"],
            ["id"],
            ondelete="RESTRICT",
        )
    op.drop_column("users", "session_version")
