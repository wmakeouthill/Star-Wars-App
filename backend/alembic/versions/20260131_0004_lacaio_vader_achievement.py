"""Add Lacaio do Vader achievement

Revision ID: 20260131_0004
Revises: 20260131_0003
Create Date: 2026-01-31

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260131_0004"
down_revision = "20260131_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Adiciona conquista 'Lacaio do Vader' para mensagens com Darth Vader."""
    op.execute(
        sa.text(
            """
            INSERT INTO achievements (id, name, description, xp_reward) VALUES
            ('lacaio_vader', 'Lacaio do Vader', 'Envie 5 mensagens ao Lorde Vader.', 50)
            ON CONFLICT (id) DO NOTHING;
            """
        )
    )


def downgrade() -> None:
    """Remove conquista 'Lacaio do Vader'."""
    op.execute(sa.text("DELETE FROM achievements WHERE id = 'lacaio_vader';"))
