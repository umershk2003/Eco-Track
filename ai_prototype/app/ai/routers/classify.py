from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid
import os

from app.database.database import get_db
from app.ai.schemas.classification import ClassificationResponse, ClassificationHistoryResponse
from app.ai.services.workflow import ClassificationWorkflow

router = APIRouter()
workflow = ClassificationWorkflow()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/classify", response_model=ClassificationResponse)
async def classify_waste(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # 1. Validation
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, and WEBP are allowed.")
        
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")
        
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file or corrupted image.")

    # 2. Storage
    filename = f"{uuid.uuid4()}_{file.filename}"
    original_path = os.path.join("uploads", filename)
    processed_path = os.path.join("uploads", f"processed_{filename}")
    
    with open(original_path, "wb") as f:
        f.write(contents)
        
    # 3. Processing
    try:
        response = await workflow.process_image(original_path, processed_path, db)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # In a production app, log this error properly
        raise HTTPException(status_code=500, detail=f"Internal server error during classification: {str(e)}")

@router.get("/history", response_model=List[ClassificationHistoryResponse])
async def get_history(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await workflow.get_history(db, skip=skip, limit=limit)

@router.get("/result/{id}", response_model=ClassificationHistoryResponse)
async def get_result(id: int, db: AsyncSession = Depends(get_db)):
    result = await workflow.get_result_by_id(id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Classification result not found")
    return result

@router.delete("/result/{id}")
async def delete_result(id: int, db: AsyncSession = Depends(get_db)):
    success = await workflow.delete_result(id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Classification result not found")
    return {"status": "success", "message": "Record deleted"}
