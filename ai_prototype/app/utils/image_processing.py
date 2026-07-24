import cv2
import numpy as np
from app.ai.schemas.classification import CVMetadata

class ImageProcessor:
    @staticmethod
    def preprocess_image(image_path: str, output_path: str) -> None:
        """
        Reads, preprocesses, and saves the image.
        Includes resizing, noise reduction, contrast enhancement, and sharpening.
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Invalid image or file not found")
            
        # 1. Resize (e.g., standard 640x640 for YOLO)
        img = cv2.resize(img, (640, 640))
        
        # 2. Noise reduction
        img = cv2.GaussianBlur(img, (3, 3), 0)
        
        # 3. Brightness/Contrast Normalization (CLAHE)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl,a,b))
        img = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        
        # 4. Sharpening
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        img = cv2.filter2D(img, -1, kernel)
        
        cv2.imwrite(output_path, img)

    @staticmethod
    def extract_metadata(image_path: str) -> CVMetadata:
        """
        Extracts basic metadata from the image using OpenCV.
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Invalid image")
            
        # Image quality (Blur variance)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        quality_score = min(blur_score / 1000.0, 1.0) # Normalize pseudo-score
        
        # Dominant color approximation (average color)
        avg_color_per_row = np.average(img, axis=0)
        avg_color = np.average(avg_color_per_row, axis=0)
        dominant_color = f"RGB({int(avg_color[2])}, {int(avg_color[1])}, {int(avg_color[0])})"
        
        # Approximate size
        h, w = img.shape[:2]
        size_str = f"{w}x{h}"
        
        # Shape estimation (just simple aspect ratio logic)
        aspect_ratio = w / float(h)
        if aspect_ratio > 1.2:
            shape = "Landscape Rectangle"
        elif aspect_ratio < 0.8:
            shape = "Portrait Rectangle"
        else:
            shape = "Square-ish"
            
        return CVMetadata(
            dominant_color=dominant_color,
            approximate_size=size_str,
            shape=shape,
            quality_score=quality_score
        )
