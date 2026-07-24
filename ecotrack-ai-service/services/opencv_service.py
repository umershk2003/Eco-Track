import cv2
import numpy as np
from typing import Tuple

class OpenCVService:
    @staticmethod
    def preprocess_image(img: np.ndarray, target_size: Tuple[int, int] = (640, 640)) -> np.ndarray:
        # Resize image
        img_resized = cv2.resize(img, target_size)
        
        # Convert BGR (OpenCV default) to RGB (YOLO default)
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        
        # Noise reduction (optional depending on YOLO model training, but asked in requirements)
        img_denoised = cv2.GaussianBlur(img_rgb, (3, 3), 0)
        
        # Note: Normalization is typically handled internally by Ultralytics YOLOv8/11.
        return img_denoised
