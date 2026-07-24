import os
import logging
from ultralytics import YOLO

logger = logging.getLogger(__name__)

class ModelService:
    _model_instance = None
    _model_path = os.getenv("YOLO_MODEL_PATH", "models/waste_yolo.pt")

    @classmethod
    def get_model(cls) -> YOLO:
        if cls._model_instance is None:
            logger.info(f"Loading YOLO model from {cls._model_path}")
            if not os.path.exists(cls._model_path):
                logger.warning(f"Model file not found at {cls._model_path}. Using default weights for testing.")
                cls._model_instance = YOLO('yolov8n.pt') # Fallback for development if file not provided
            else:
                cls._model_instance = YOLO(cls._model_path)
        return cls._model_instance

