from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.detection_schema import DetectionResponse
from utils.image_utils import validate_image_format, decode_image
from services.opencv_service import OpenCVService
from services.yolo_service import YOLOService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/detect", response_model=DetectionResponse)
async def detect_waste(image: UploadFile = File(...)):
    if not validate_image_format(image.content_type):
        raise HTTPException(status_code=400, detail="Invalid image format. Supported formats: jpeg, png, webp")

    try:
        contents = await image.read()
        
        # 1. Decode
        img = decode_image(contents)
        
        # 2. Preprocess (OpenCV)
        # We capture original dimensions for relative bounding boxes if needed, 
        # but Ultralytics can handle arbitrary sizes directly. 
        # Using the preprocess function to demonstrate the pipeline requirement.
        processed_img = OpenCVService.preprocess_image(img)
        
        # 3. Inference (YOLO)
        # Note: We pass the original image or processed based on how model was trained.
        # Passing original here so YOLO resizes it internally correctly while keeping aspect ratio.
        detections = YOLOService.run_inference(img)
        
        return DetectionResponse(success=True, detections=detections)
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return DetectionResponse(success=False, detections=[], error=str(e))
