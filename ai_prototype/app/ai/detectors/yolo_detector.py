import os
from typing import List, Optional
from ultralytics import YOLO
from app.ai.schemas.classification import DetectedObject

# ──────────────────────────────────────────────────────────────────────
# Complete COCO-80 class categorisation for EcoTrack waste detection
# ──────────────────────────────────────────────────────────────────────

# COCO classes that are clearly NOT waste items — filter these out
NON_WASTE_CLASSES = {
    # People
    "person",
    # Vehicles / transportation
    "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    # Street infrastructure
    "traffic light", "fire hydrant", "stop sign", "parking meter",
    # Animals
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear",
    "zebra", "giraffe",
}

# COCO classes that ARE relevant to waste classification (all remaining 55 classes)
WASTE_RELEVANT_CLASSES = {
    # ── Containers / Tableware ──
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl",
    # ── Food items (organic waste) ──
    "banana", "apple", "sandwich", "orange", "broccoli", "carrot",
    "hot dog", "pizza", "donut", "cake",
    # ── Electronics / Appliances ──
    "laptop", "mouse", "remote", "keyboard", "cell phone",
    "tv", "microwave", "oven", "toaster", "refrigerator",
    # ── Bags / Luggage / Accessories ──
    "backpack", "umbrella", "handbag", "tie", "suitcase",
    # ── Sports / Recreation ──
    "frisbee", "skis", "snowboard", "sports ball", "kite",
    "baseball bat", "baseball glove", "skateboard", "surfboard",
    "tennis racket",
    # ── Furniture / Large items (bulk waste) ──
    "bench", "chair", "couch", "potted plant", "bed", "dining table",
    "toilet", "sink",
    # ── Household / Personal care ──
    "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush",
}

# ──────────────────────────────────────────────────────────────────────
# Waste category mapping — maps each COCO waste class to an EcoTrack
# waste category so that Gemini receives a pre-hint alongside each
# detected object.
#
# Categories: Plastic, Metal, Glass, Paper, Organic, Electronic,
#             Textile, Hazardous, Bulk, Other
# ──────────────────────────────────────────────────────────────────────
WASTE_CATEGORY_MAP = {
    # ── Plastic ──
    "bottle":           "Plastic",
    "cup":              "Plastic",
    "frisbee":          "Plastic",
    "toothbrush":       "Plastic",
    # ── Metal ──
    "fork":             "Metal",
    "knife":            "Metal",
    "spoon":            "Metal",
    "scissors":         "Metal",
    # ── Glass ──
    "wine glass":       "Glass",
    "vase":             "Glass",
    # ── Paper ──
    "book":             "Paper",
    # ── Organic / Food ──
    "banana":           "Organic",
    "apple":            "Organic",
    "sandwich":         "Organic",
    "orange":           "Organic",
    "broccoli":         "Organic",
    "carrot":           "Organic",
    "hot dog":          "Organic",
    "pizza":            "Organic",
    "donut":            "Organic",
    "cake":             "Organic",
    "potted plant":     "Organic",
    "bowl":             "Organic",       # often contains food waste
    # ── Electronic / E-waste ──
    "laptop":           "Electronic",
    "mouse":            "Electronic",
    "remote":           "Electronic",
    "keyboard":         "Electronic",
    "cell phone":       "Electronic",
    "tv":               "Electronic",
    "microwave":        "Electronic",
    "oven":             "Electronic",
    "toaster":          "Electronic",
    "refrigerator":     "Electronic",
    "hair drier":       "Electronic",
    "clock":            "Electronic",
    # ── Textile / Fabric ──
    "backpack":         "Textile",
    "umbrella":         "Textile",
    "handbag":          "Textile",
    "tie":              "Textile",
    "suitcase":         "Textile",
    "teddy bear":       "Textile",
    # ── Sports / Composite materials ──
    "skis":             "Other",
    "snowboard":        "Other",
    "sports ball":      "Other",
    "kite":             "Other",
    "baseball bat":     "Other",
    "baseball glove":   "Other",
    "skateboard":       "Other",
    "surfboard":        "Other",
    "tennis racket":    "Other",
    # ── Bulk / Furniture ──
    "bench":            "Bulk",
    "chair":            "Bulk",
    "couch":            "Bulk",
    "bed":              "Bulk",
    "dining table":     "Bulk",
    "toilet":           "Bulk",
    "sink":             "Bulk",
}



class YoloDetector:
    def __init__(self, model_name: str = "yolov8n.pt"):
        # This will auto-download the model if it doesn't exist
        self.model = YOLO(model_name)

    @staticmethod
    def get_waste_category(class_name: str) -> Optional[str]:
        """Return the EcoTrack waste category for a COCO class name, or None."""
        return WASTE_CATEGORY_MAP.get(class_name)

    def detect(self, image_path: str) -> List[DetectedObject]:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at {image_path}")

        results = self.model(image_path, verbose=False)
        detected_objects = []

        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())
                class_name = self.model.names[cls_id].lower()

                # Skip non-waste objects (people, animals, vehicles, etc.)
                if class_name in NON_WASTE_CLASSES:
                    print(f"🚫 Skipped non-waste detection: {class_name} ({confidence:.0%})")
                    continue

                # Only include detections above 30% confidence
                if confidence < 0.30:
                    continue

                # Build a descriptive name with waste-category hint
                display_name = class_name.replace("-", " ").title()
                waste_category = self.get_waste_category(class_name)
                if waste_category:
                    display_name = f"{display_name} [{waste_category}]"

                detected_objects.append(
                    DetectedObject(
                        name=display_name,
                        confidence=confidence
                    )
                )

        # If no waste objects were found after filtering
        if not detected_objects:
            print("ℹ️  No waste objects detected — Gemini will classify based on image features only.")
            detected_objects.append(DetectedObject(name="Unidentified Object", confidence=0.0))

        return detected_objects

    @staticmethod
    def verify_class_coverage() -> dict:
        """
        Utility to verify that every COCO-80 class is accounted for in
        either NON_WASTE_CLASSES or WASTE_RELEVANT_CLASSES.
        Returns a dict with 'missing', 'non_waste_count', and 'waste_count'.
        """
        all_coco_80 = {
            "person", "bicycle", "car", "motorcycle", "airplane", "bus",
            "train", "truck", "boat", "traffic light", "fire hydrant",
            "stop sign", "parking meter", "bench", "bird", "cat", "dog",
            "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe",
            "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
            "skis", "snowboard", "sports ball", "kite", "baseball bat",
            "baseball glove", "skateboard", "surfboard", "tennis racket",
            "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl",
            "banana", "apple", "sandwich", "orange", "broccoli", "carrot",
            "hot dog", "pizza", "donut", "cake", "chair", "couch",
            "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
            "mouse", "remote", "keyboard", "cell phone", "microwave", "oven",
            "toaster", "sink", "refrigerator", "book", "clock", "vase",
            "scissors", "teddy bear", "hair drier", "toothbrush",
        }
        covered = NON_WASTE_CLASSES | WASTE_RELEVANT_CLASSES
        missing = all_coco_80 - covered
        return {
            "missing": missing,
            "non_waste_count": len(NON_WASTE_CLASSES),
            "waste_count": len(WASTE_RELEVANT_CLASSES),
            "total_covered": len(covered),
        }

