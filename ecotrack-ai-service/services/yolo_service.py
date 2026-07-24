from typing import List
import numpy as np
from services.model_service import ModelService
from schemas.detection_schema import Detection, BoundingBox

class YOLOService:
    @staticmethod
    def run_inference(img: np.ndarray) -> List[Detection]:
        model = ModelService.get_model()
        results = model.predict(source=img, conf=0.25)
        
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # get coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                class_name = model.names[class_id]

                width = x2 - x1
                height = y2 - y1

                detections.append(Detection(
                    class_name=class_name,
                    confidence=confidence,
                    boundingBox=BoundingBox(
                        x=x1,
                        y=y1,
                        width=width,
                        height=height
                    )
                ))
        return detections
