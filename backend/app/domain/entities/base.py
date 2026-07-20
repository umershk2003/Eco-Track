import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import DateTime, Integer, String, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    Enterprise-grade Abstract Base declarative schema.
    Provides standard models with automatic column naming conventions,
    asynchronous serialization, and basic operational attributes.
    """
    pass


class TimestampMixin:
    """Mixin for tracking creation and modification timestamps."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SoftDeleteMixin:
    """Mixin adding native soft delete capabilities."""
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def soft_delete(self) -> None:
        self.is_deleted = True
        self.deleted_at = datetime.now(timezone.utc)

    def restore(self) -> None:
        self.is_deleted = False
        self.deleted_at = None


class OptimisticLockMixin:
    """Mixin for optimistic concurrency control (version locking)."""
    version_id: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class UUIDPrimaryKeyMixin:
    """Mixin incorporating secure UUIDv4 primary keys."""
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
