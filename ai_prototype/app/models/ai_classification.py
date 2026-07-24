import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, Text
from app.database.database import Base

class AIClassification(Base):
    __tablename__ = "ai_classifications"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, nullable=False)
    
    # Stores YOLO objects or Gemini reasoning context
    detected_objects = Column(JSON, nullable=True) 
    
    category = Column(String, index=True)
    subcategory = Column(String, index=True)
    confidence = Column(Float)
    
    recyclable = Column(Boolean, default=False)
    hazard_level = Column(String)
    
    recommended_bin = Column(String)
    disposal_method = Column(Text)
    recycling_tip = Column(Text)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
