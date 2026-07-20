from pydantic import BaseModel
from typing import List

class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class Detection(BaseModel):
    class_name: str
    confidence: float
    boundingBox: BoundingBox

class DetectionResponse(BaseModel):
    success: bool
    detections: List[Detection]
    error: str | None = None
