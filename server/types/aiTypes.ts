export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PythonDetection {
    class_name: string;
    confidence: number;
    boundingBox: BoundingBox;
}

export interface PythonDetectionResponse {
    success: boolean;
    detections: PythonDetection[];
    error?: string;
}

export interface WasteConfig {
    category: string;
    recyclable: boolean;
    disposalMethod: string;
    decompositionTime: string; // Changed from decompositionYears to decompositionTime for flexibility
    ecoPoints: number;
}

export interface FormattedDetection extends PythonDetection {
    category: string;
    recyclable: boolean;
    disposalMethod: string;
    decompositionTime: string;
    ecoPoints: number;
}

export interface AISummary {
    totalObjects: number;
    recyclable: number;
    hazardous: number;
    organic: number;
    ecoPoints: number;
}

export interface AIResponse {
    success: boolean;
    detections: FormattedDetection[];
    summary: AISummary;
    scanId?: string;
}

export interface ScanDocument {
    userId: string;
    imageUrl: string;
    detections: FormattedDetection[];
    totalObjects: number;
    recyclableCount: number;
    hazardousCount: number;
    ecoPoints: number;
    createdAt: Date;
}
