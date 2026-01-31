"""add quiz_results table (quiz leaderboard)

Revision ID: 20260131_0003
Revises: 20260131_0002
Create Date: 2026-01-31

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260131_0003"
down_revision = "20260131_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "quiz_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correct_answers", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_questions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("categories", sa.String(length=400), nullable=True),
        sa.Column("xp_earned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("played_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )

    op.create_index("ix_quiz_results_user_id", "quiz_results", ["user_id"], unique=False)
    op.create_index("ix_quiz_results_played_at", "quiz_results", ["played_at"], unique=False)
    op.create_index("ix_quiz_results_user_score", "quiz_results", ["user_id", "score"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_quiz_results_user_score", table_name="quiz_results")
    op.drop_index("ix_quiz_results_played_at", table_name="quiz_results")
    op.drop_index("ix_quiz_results_user_id", table_name="quiz_results")
    op.drop_table("quiz_results")

