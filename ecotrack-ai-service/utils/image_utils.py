import numpy as np
import cv2

def validate_image_format(content_type: str) -> bool:
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    return content_type in allowed_types

def decode_image(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image")
    return img
