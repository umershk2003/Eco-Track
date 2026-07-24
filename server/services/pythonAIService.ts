import axios from 'axios';
import FormData from 'form-data';
import { PythonDetectionResponse } from '../types/aiTypes';

export class PythonAIService {
    private readonly aiServiceUrl: string;

    constructor() {
        this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/ai/detect';
    }

    public async detectWaste(imageBuffer: Buffer, filename: string, mimetype: string): Promise<PythonDetectionResponse> {
        try {
            const formData = new FormData();
            formData.append('image', imageBuffer, {
                filename: filename,
                contentType: mimetype
            });

            const response = await axios.post<PythonDetectionResponse>(this.aiServiceUrl, formData, {
                headers: {
                    ...formData.getHeaders()
                }
            });

            return response.data;
        } catch (error: any) {
            console.error('Error communicating with AI service:', error.message);
            return {
                success: false,
                detections: [],
                error: error.response?.data?.error || 'Failed to communicate with AI Service'
            };
        }
    }
}

export const pythonAIService = new PythonAIService();
