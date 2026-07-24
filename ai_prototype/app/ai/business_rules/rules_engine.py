from app.ai.schemas.classification import GeminiReasoningResponse

class BusinessRulesEngine:
    @staticmethod
    def apply_rules(ai_response: GeminiReasoningResponse, objects: list) -> dict:
        """
        Applies strict, configurable business rules that override or enhance Gemini's output.
        Returns a dictionary containing the recommended bin and any overrides.
        """
        
        category = ai_response.category.lower()
        subcategory = ai_response.subcategory.lower()
        hazard_level = ai_response.hazard_level
        recommended_bin = "General Waste Bin (Black)"
        
        # Check all YOLO detected objects to see if a battery/medical waste slipped through
        object_names = [obj.name.lower() for obj in objects]
        
        # 1. Strict Hazard Overrides
        if "battery" in object_names or "electronics" in category:
            hazard_level = "High"
            recommended_bin = "Hazardous Waste Drop-off (E-waste)"
        elif "medical" in object_names or "syringe" in object_names:
            hazard_level = "High"
            recommended_bin = "Red Medical Waste Bin"
        
        # 2. Category Routing
        elif category == "plastic":
            recommended_bin = "Blue Recycling Bin"
        elif category == "paper" or category == "cardboard":
            recommended_bin = "Blue Recycling Bin"
        elif category == "metal" or category == "glass":
            recommended_bin = "Blue Recycling Bin"
        elif category == "organic" or category == "food":
            recommended_bin = "Green Compost Bin"

        return {
            "recommended_bin": recommended_bin,
            "hazard_level": hazard_level
        }
