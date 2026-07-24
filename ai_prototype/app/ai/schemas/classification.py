from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class DetectedObject(BaseModel):
    name: str
    confidence: float

class ClassificationResponse(BaseModel):
    category: str = Field(description="The broad waste category (e.g., Plastic, Metal)")
    subcategory: str = Field(description="The specific subcategory (e.g., PET Bottle)")
    detected_objects: List[DetectedObject]
    confidence: float
    recyclable: bool
    recommended_bin: str
    hazard_level: str
    disposal_method: str
    recycling_tip: Optional[str] = None
    
    class Config:
        from_attributes = True

class ClassificationHistoryResponse(ClassificationResponse):
    id: int
    image_path: str
    created_at: datetime
    
class GeminiReasoningResponse(BaseModel):
    category: str
    subcategory: str
    recyclable: bool
    hazard_level: str
    disposal_instructions: str
    recycling_tips: Optional[str] = None

class CVMetadata(BaseModel):
    dominant_color: str
    approximate_size: str
    shape: str
    quality_score: float
