import json
from google import genai
from groq import Groq
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from current dir, then parent dir (handles running from ai_prototype/ or ecotrack/)
load_dotenv(dotenv_path=Path(__file__).resolve().parents[4] / ".env")
load_dotenv()  # also try cwd as fallback

from app.utils.image_processing import ImageProcessor
from app.ai.detectors.yolo_detector import YoloDetector
from app.ai.prompts.gemini_prompts import GEMINI_WASTE_CLASSIFICATION_SYSTEM_PROMPT, generate_classification_prompt
from app.ai.business_rules.rules_engine import BusinessRulesEngine
from app.ai.schemas.classification import ClassificationResponse, GeminiReasoningResponse, ClassificationHistoryResponse
from app.repositories.classification_repository import ClassificationRepository

class ClassificationWorkflow:
    def __init__(self):
        self.yolo = YoloDetector()
        self.rules_engine = BusinessRulesEngine()

        # --- Gemini Setup ---
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        self.gemini_client: Optional[genai.Client] = None
        if gemini_key:
            try:
                self.gemini_client = genai.Client(api_key=gemini_key)
                print("✅ Gemini AI client initialized.")
            except Exception as e:
                print(f"⚠️  Gemini setup failed: {e}")

        # --- Groq Setup ---
        groq_key = os.getenv("GROQ_API_KEY", "")
        self.groq_client: Optional[Groq] = None
        if groq_key:
            try:
                self.groq_client = Groq(api_key=groq_key)
                print("✅ Groq AI client initialized.")
            except Exception as e:
                print(f"⚠️  Groq setup failed: {e}")

        if not self.gemini_client and not self.groq_client:
            print("⚠️  No AI provider configured. Add GEMINI_API_KEY or GROQ_API_KEY to your .env file.")

    def _parse_ai_response(self, raw_text: str) -> GeminiReasoningResponse:
        """Parse JSON from LLM response, stripping any markdown code fences."""
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
        ai_data = json.loads(raw_text)
        return GeminiReasoningResponse(**ai_data)

    def _fallback_response(self) -> GeminiReasoningResponse:
        """Return a safe default when all AI providers fail."""
        return GeminiReasoningResponse(
            category="Unknown",
            subcategory="Unclassified",
            recyclable=False,
            hazard_level="Unknown",
            disposal_instructions="Could not classify. Place in general waste as a precaution.",
            recycling_tips="Ensure an API key is configured for better results."
        )

    def _call_gemini(self, prompt: str) -> GeminiReasoningResponse:
        """Call Gemini and return parsed response."""
        response = self.gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[GEMINI_WASTE_CLASSIFICATION_SYSTEM_PROMPT, prompt]
        )
        return self._parse_ai_response(response.text)

    def _call_groq(self, prompt: str) -> GeminiReasoningResponse:
        """Call Groq (Llama) and return parsed response."""
        response = self.groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": GEMINI_WASTE_CLASSIFICATION_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        raw_text = response.choices[0].message.content
        return self._parse_ai_response(raw_text)

    async def process_image(self, original_path: str, processed_path: str, db_session: AsyncSession) -> ClassificationResponse:
        # 1. Preprocess & Metadata
        ImageProcessor.preprocess_image(original_path, processed_path)
        cv_metadata = ImageProcessor.extract_metadata(processed_path)

        # 2. YOLO Detection
        detected_objects = self.yolo.detect(processed_path)
        yolo_str = json.dumps([obj.model_dump() for obj in detected_objects], indent=2)
        cv_str = json.dumps(cv_metadata.model_dump(), indent=2)

        # 3. AI Reasoning — Gemini first, Groq as fallback
        prompt = generate_classification_prompt(yolo_str, cv_str)
        reasoning = None
        provider_used = "none"

        if self.gemini_client:
            try:
                reasoning = self._call_gemini(prompt)
                provider_used = "gemini"
                print(f"✅ Classified via Gemini.")
            except Exception as e:
                print(f"⚠️  Gemini failed: {e}. Trying Groq...")

        if reasoning is None and self.groq_client:
            try:
                reasoning = self._call_groq(prompt)
                provider_used = "groq"
                print(f"✅ Classified via Groq.")
            except Exception as e:
                print(f"⚠️  Groq failed: {e}. Using fallback.")

        if reasoning is None:
            reasoning = self._fallback_response()
            provider_used = "fallback"
            print("⚠️  Using fallback response (no AI provider available).")

        # 4. Business Rules
        rule_results = self.rules_engine.apply_rules(reasoning, detected_objects)

        # 5. Build final response
        highest_conf = max([obj.confidence for obj in detected_objects], default=0.0)

        final_response = ClassificationResponse(
            category=reasoning.category,
            subcategory=reasoning.subcategory,
            detected_objects=detected_objects,
            confidence=highest_conf,
            recyclable=reasoning.recyclable,
            recommended_bin=rule_results["recommended_bin"],
            hazard_level=rule_results["hazard_level"],
            disposal_method=reasoning.disposal_instructions,
            recycling_tip=reasoning.recycling_tips
        )

        # 6. Save to Database
        repo = ClassificationRepository(db_session)
        await repo.save_classification({
            "image_path": original_path,
            "detected_objects": [obj.model_dump() for obj in detected_objects],
            "category": final_response.category,
            "subcategory": final_response.subcategory,
            "confidence": final_response.confidence,
            "recyclable": final_response.recyclable,
            "hazard_level": final_response.hazard_level,
            "recommended_bin": final_response.recommended_bin,
            "disposal_method": final_response.disposal_method,
            "recycling_tip": final_response.recycling_tip
        })

        return final_response

    async def get_history(self, db_session: AsyncSession, skip: int = 0, limit: int = 100) -> List[ClassificationHistoryResponse]:
        repo = ClassificationRepository(db_session)
        records = await repo.get_all_history(skip, limit)
        return [ClassificationHistoryResponse.model_validate(record) for record in records]

    async def get_result_by_id(self, record_id: int, db_session: AsyncSession) -> ClassificationHistoryResponse:
        repo = ClassificationRepository(db_session)
        record = await repo.get_by_id(record_id)
        if not record:
            return None
        return ClassificationHistoryResponse.model_validate(record)

    async def delete_result(self, record_id: int, db_session: AsyncSession) -> bool:
        repo = ClassificationRepository(db_session)
        return await repo.delete(record_id)
