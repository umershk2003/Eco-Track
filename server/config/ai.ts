import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { Logger } from '../utils/logger';

dotenv.config();

let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  ai = new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  Logger.info('AI', 'Gemini API client initialized successfully');
} else {
  Logger.warn('AI', 'GEMINI_API_KEY environment variable is not defined');
}

const groqApiKey = process.env.GROQ_API_KEY;
if (groqApiKey) {
  Logger.info('AI', 'Groq API Key detected! Groq will serve as the primary engine with Gemini as the automatic backup.');
} else {
  Logger.info('AI', 'Groq API Key not detected. Gemini will be used as the primary engine.');
}

export { ai, groqApiKey };
