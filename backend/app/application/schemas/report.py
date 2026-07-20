import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities.report import ReportStatus


# ==========================================
# Bin Report Schemas
# ==========================================
class BinReportBase(BaseModel):
    image_url: str = Field(..., max_length=512)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address: str = Field(..., max_length=255)
    severity: str = Field(..., max_length=50)


class BinReportCreate(BinReportBase):
    pass


class BinReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    severity: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=255)


class BinReportResponse(BinReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    status: ReportStatus
    upvotes: int
    created_at: datetime
    updated_at: datetime


# ==========================================
# Waste Report Schemas (AI Classification Logs)
# ==========================================
class WasteReportBase(BaseModel):
    image_url: str = Field(..., max_length=512)
    category: str = Field(..., max_length=100)
    bin_color: str = Field(..., max_length=50)
    confidence: float = Field(..., ge=0.0, le=1.0)
    explanation: str


class WasteReportCreate(WasteReportBase):
    pass


class WasteReportResponse(WasteReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime


# ==========================================
# Pickup Schedule Schemas
# ==========================================
class PickupScheduleBase(BaseModel):
    area_name: str = Field(..., max_length=255)
    city: str = Field("Hyderabad", max_length=100)
    collector_name: str = Field(..., max_length=100)
    time_slot: str = Field(..., max_length=100)
    frequency: str = Field(..., max_length=100)


class PickupScheduleCreate(PickupScheduleBase):
    pass


class PickupScheduleUpdate(BaseModel):
    area_name: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    collector_name: Optional[str] = Field(None, max_length=100)
    time_slot: Optional[str] = Field(None, max_length=100)
    frequency: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class PickupScheduleResponse(PickupScheduleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
