"""init persistence (users, auth, gamification, chat, image fallback)

Revision ID: 20260130_0001
Revises:
Create Date: 2026-01-30

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260130_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -----------------------
    # users
    # -----------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("google_sub", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=True),
        sa.Column("picture", sa.String(length=800), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("google_sub", name="uq_users_google_sub"),
    )
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    # -----------------------
    # refresh_tokens (rotativo)
    # -----------------------
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("jti", sa.String(length=64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.UniqueConstraint("jti", name="uq_refresh_tokens_jti"),
    )
    op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"], unique=True)
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"], unique=False)
    op.create_index("ix_refresh_tokens_expires_at", "refresh_tokens", ["expires_at"], unique=False)
    op.create_index("ix_refresh_tokens_user_active", "refresh_tokens", ["user_id", "revoked_at"], unique=False)

    # -----------------------
    # achievements + user_gamification
    # -----------------------
    op.create_table(
        "achievements",
        sa.Column("id", sa.String(length=80), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "user_gamification",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_queries", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chat_messages", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("jedi_rank", sa.String(length=40), nullable=False, server_default="Youngling"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )

    op.create_table(
        "user_achievements",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("achievement_id", sa.String(length=80), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["achievement_id"], ["achievements.id"]),
        sa.PrimaryKeyConstraint("user_id", "achievement_id"),
        sa.UniqueConstraint("user_id", "achievement_id", name="uq_user_achievements_user_achievement"),
    )

    # Seed de conquistas do MVP atual
    op.execute(
        sa.text(
            """
            INSERT INTO achievements (id, name, description, xp_reward) VALUES
            ('primeiro_contato','Primeiro Contato','Sua primeira interação com o Holocron.',25),
            ('amigo_yoda','Amigo do Yoda','Envie 5 mensagens ao Mestre Yoda.',50),
            ('explorador','Explorador da Galáxia','Realize 10 consultas aos arquivos do Holocron.',50)
            ON CONFLICT (id) DO NOTHING;
            """
        )
    )

    # -----------------------
    # chat conversations/messages
    # -----------------------
    op.create_table(
        "chat_conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("persona", sa.String(length=20), nullable=False, server_default="yoda"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_chat_conversations_user_id", "chat_conversations", ["user_id"], unique=False)

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["chat_conversations.id"]),
    )
    op.create_index("ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"], unique=False)
    op.create_index(
        "ix_chat_messages_conversation_created",
        "chat_messages",
        ["conversation_id", "created_at"],
        unique=False,
    )

    # -----------------------
    # character image fallback
    # -----------------------
    op.create_table(
        "character_image_fallbacks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("character_name", sa.String(length=200), nullable=False),
        sa.Column("character_name_norm", sa.String(length=220), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("character_name_norm", name="uq_character_image_fallbacks_name_norm"),
    )
    op.create_index(
        "ix_character_image_fallbacks_name_norm",
        "character_image_fallbacks",
        ["character_name_norm"],
        unique=True,
    )
    op.create_index(
        "ix_character_image_fallbacks_name",
        "character_image_fallbacks",
        ["character_name"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_character_image_fallbacks_name", table_name="character_image_fallbacks")
    op.drop_index("ix_character_image_fallbacks_name_norm", table_name="character_image_fallbacks")
    op.drop_table("character_image_fallbacks")

    op.drop_index("ix_chat_messages_conversation_created", table_name="chat_messages")
    op.drop_index("ix_chat_messages_conversation_id", table_name="chat_messages")
    op.drop_table("chat_messages")

    op.drop_index("ix_chat_conversations_user_id", table_name="chat_conversations")
    op.drop_table("chat_conversations")

    op.drop_table("user_achievements")
    op.drop_table("user_gamification")
    op.drop_table("achievements")

    op.drop_index("ix_refresh_tokens_user_active", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_expires_at", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_jti", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_table("users")

