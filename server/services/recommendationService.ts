import { WasteConfig } from '../types/aiTypes';

export class RecommendationService {
    // In a real application, this might be loaded from a database or a separate config file
    // The prompt requested a configurable waste knowledge system not hardcoded in logic.
    // We encapsulate it here so it can be swapped with a Firestore fetch later if needed.
    private knowledgeBase: Record<string, WasteConfig> = {
        "plastic_bottle": {
            category: "Plastic",
            recyclable: true,
            disposalMethod: "Plastic Recycling Bin",
            decompositionTime: "450 years",
            ecoPoints: 10
        },
        "aluminum_can": {
            category: "Metal",
            recyclable: true,
            disposalMethod: "Metal Recycling Bin",
            decompositionTime: "80-200 years",
            ecoPoints: 15
        },
        "cardboard_box": {
            category: "Cardboard",
            recyclable: true,
            disposalMethod: "Paper Recycling Bin",
            decompositionTime: "2 months",
            ecoPoints: 5
        },
        "banana_peel": {
            category: "Food Waste",
            recyclable: false, // Compostable, but typically not "recyclable" in standard bins
            disposalMethod: "Compost Bin",
            decompositionTime: "2-10 days",
            ecoPoints: 2
        },
        "battery": {
            category: "Hazardous Waste",
            recyclable: false,
            disposalMethod: "Special Hazardous Waste Facility",
            decompositionTime: "100+ years",
            ecoPoints: 0 // Penalized or zero depending on system, handling is dangerous
        },
        "mobile_phone": {
            category: "E-Waste",
            recyclable: true,
            disposalMethod: "E-Waste Collection Center",
            decompositionTime: "1-2 million years",
            ecoPoints: 50
        }
        // ... add more as needed
    };

    private getDefaultConfig(className: string): WasteConfig {
        return {
            category: "Unknown",
            recyclable: false,
            disposalMethod: "General Waste",
            decompositionTime: "Unknown",
            ecoPoints: 0
        };
    }

    public getRecommendation(className: string): WasteConfig {
        const key = className.toLowerCase().replace(/ /g, '_');
        return this.knowledgeBase[key] || this.getDefaultConfig(className);
    }
}
