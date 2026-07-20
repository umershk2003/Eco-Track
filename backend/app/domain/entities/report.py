import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, String, Integer, Float, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.domain.entities.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class ReportStatus(str, Enum):
    REPORTED = "reported"
    ASSIGNED = "assigned"
    COLLECTED = "collected"


class BinReport(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "bin_reports"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ReportStatus] = mapped_column(
        String(50), 
        default=ReportStatus.REPORTED, 
        nullable=False
    )
    severity: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "Full Bin", "Overflowing"
    upvotes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Relationship back to User
    reporter: Mapped["User"] = relationship("User", back_populates="bin_reports")


class WasteReport(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Waste Classification reports logged by the AI Sorter.
    """
    __tablename__ = "waste_reports"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "recyclable-plastic", "organic"
    bin_color: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "Blue Bin"
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)


class PickupSchedule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "pickup_schedules"

    area_name: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), default="Hyderabad", nullable=False)
    collector_name: Mapped[str] = mapped_column(String(100), nullable=False)
    time_slot: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "09:00 AM - 11:00 AM"
    frequency: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "Daily", "Weekly"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class RewardTransaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "reward_transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "earn_scan", "earn_report", "redeem"
    description: Mapped[str] = mapped_column(String(255), nullable=False)


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "USER_LOGIN", "REPLAY_ATTEMPT"
    details: Mapped[str] = mapped_column(Text, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
