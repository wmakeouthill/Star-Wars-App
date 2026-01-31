"""add generic image_fallbacks table

Revision ID: 20260131_0002
Revises: 20260130_0001
Create Date: 2026-01-31

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260131_0002"
down_revision = "20260130_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "image_fallbacks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("resource", sa.String(length=40), nullable=False),
        sa.Column("item_name", sa.String(length=200), nullable=False),
        sa.Column("item_name_norm", sa.String(length=220), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("resource", "item_name_norm", name="uq_image_fallbacks_resource_name_norm"),
    )
    op.create_index("ix_image_fallbacks_resource", "image_fallbacks", ["resource"], unique=False)
    op.create_index(
        "ix_image_fallbacks_resource_name_norm",
        "image_fallbacks",
        ["resource", "item_name_norm"],
        unique=True,
    )
    op.create_index(
        "ix_image_fallbacks_resource_item_name",
        "image_fallbacks",
        ["resource", "item_name"],
        unique=False,
    )

    # Migração de dados: leva os fallbacks existentes de personagens para a tabela genérica.
    op.execute(
        sa.text(
            """
            INSERT INTO image_fallbacks (id, resource, item_name, item_name_norm, image_url, created_at, updated_at)
            SELECT
              id,
              'characters' as resource,
              character_name as item_name,
              character_name_norm as item_name_norm,
              image_url,
              created_at,
              updated_at
            FROM character_image_fallbacks
            ON CONFLICT (resource, item_name_norm) DO NOTHING;
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_image_fallbacks_resource_item_name", table_name="image_fallbacks")
    op.drop_index("ix_image_fallbacks_resource_name_norm", table_name="image_fallbacks")
    op.drop_index("ix_image_fallbacks_resource", table_name="image_fallbacks")
    op.drop_table("image_fallbacks")

