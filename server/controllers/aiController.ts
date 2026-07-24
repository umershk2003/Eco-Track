import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/aiService';
import { ai, groqApiKey } from '../config/ai';
import { ValidationError, ApiError } from '../utils/errors';
import { Logger } from '../utils/logger';

export class AIController {
  /**
   * Classifies waste via post-uploaded photos
   */
  public async classifyWaste(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        throw new ValidationError('Missing imageBase64 in request body.');
      }

      Logger.info('AI', 'Starting waste classification request...');
      const result = await aiService.classifyWaste(imageBase64, mimeType);
      
      Logger.info('AI', 'Waste classification completed successfully', {
        category: result.category,
        source: result.classificationSource,
        confidence: result.confidence
      });
      return res.json(result);
    } catch (error: any) {
      Logger.warn('AI', 'Error in classifyWaste, falling back to Grok AI Local:', error.message || error);
      try {
        const base64Data = (req.body?.imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
        const localResult = aiService.localGrokClassify(base64Data);
        return res.json({
          ...localResult,
          classificationSource: 'Grok AI (Fallback)'
        });
      } catch (fallbackError) {
        next(new ApiError('Failed to classify waste even with fallback'));
      }
    }
  }

  /**
   * SSE Streaming chat assistant with automatic multilingual and safety guardrails
   */
  public async chat(req: Request, res: Response, next: NextFunction) {
    try {
      if (!ai && !groqApiKey) {
        Logger.error('AI', 'Neither Gemini client nor Groq key is initialized.');
        throw new ApiError('AI services are not configured on this server.');
      }

      const { messages, currentMessage, language } = req.body;
      if (!currentMessage) {
        throw new ValidationError('Missing currentMessage.');
      }

      Logger.info('AI', `Processing chat request for language: ${language || 'detect'}`);

      // 1. STRICT SCOPE VALIDATION: Enforce waste management/EcoTrack only
      if (!aiService.isQueryRelatedToWasteManagement(currentMessage)) {
        Logger.warn('AI', 'Chat request rejected due to strict scope guardrails', { message: currentMessage });
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const isUrdu = language === 'ur' || /[\u0600-\u06FF]/.test(currentMessage);
        const isSindhi = language === 'sd';
        const isRomanUrdu = currentMessage.toLowerCase().includes('kya') || currentMessage.toLowerCase().includes('yeh') || currentMessage.toLowerCase().includes('hai') || currentMessage.toLowerCase().includes('karo') || currentMessage.toLowerCase().includes('kab') || currentMessage.toLowerCase().includes('batao') || currentMessage.toLowerCase().includes('shukriya') || currentMessage.toLowerCase().includes('mein') || currentMessage.toLowerCase().includes('ko');

        let rejectionMsg = "I can only assist with questions related to EcoTrack, waste management, recycling, composting, or environmental topics. Please ask me about these areas!";
        if (isSindhi) {
          rejectionMsg = "معذرت، مان صرف ايڪو ٽريڪ ۽ ويسٽ مئنيجمينٽ (ڪچري جي نيڪال) بابت سوالن جا جواب ڏئي سگهان ٿو. مهرباني ڪري ڪچري کي الڳ ڪرڻ، ري سائڪلنگ يا ڀاڻ ٺاهڻ بابت پڇو!";
        } else if (isUrdu) {
          rejectionMsg = "معذرت، میں صرف ایکو ٹریک اور ویسٹ مینجمنٹ (کچرے کی نکاسی) سے متعلق سوالات کے جوابات دے سکتا ہوں۔ برائے مہربانی مجھ سے کچرے کو الگ کرنے، ری سائیکلنگ یا کھاد بنانے کے بارے میں پوچھیں!";
        } else if (isRomanUrdu) {
          rejectionMsg = "Maazrat, main sirf EcoTrack aur waste management se mutaliq sawalat ke jawab de sakta hoon. Please recycling, composting ya colored bins ke baare mein poochein!";
        }

        const words = rejectionMsg.split(/(\s+)/);
        for (const word of words) {
          if (word) {
            res.write(`data: ${JSON.stringify({ text: word })}\n\n`);
            await new Promise(resolve => setTimeout(resolve, 15));
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // Generate strict language instructions depending on the selected language
      let languagePrompt = "LANGUAGE POLICY: Answer the user's question completely and accurately. Detect the script they use, but adhere primarily to their chosen language preference.";
      if (language === 'ur') {
        languagePrompt = "CRITICAL LANGUAGE REQUIREMENT: The user has selected URDU (اردو) as their preferred language. You MUST reply ONLY in Urdu language using the standard Urdu script (nastaliq/arabic characters). Do NOT under any circumstances reply in English or Roman Urdu. Even if the user asks a question using English words or mixed script, you must reply strictly and entirely in beautiful, correct Urdu script.";
      } else if (language === 'sd') {
        languagePrompt = "CRITICAL LANGUAGE REQUIREMENT: The user has selected SINDHI (سنڌي) as their preferred language. You MUST reply ONLY in Sindhi language using the standard Sindhi Arabic script. Do NOT under any circumstances reply in English or Urdu or Roman script. Even if the user asks a question using English words or mixed script, you must reply strictly and entirely in beautiful, correct Sindhi script.";
      } else if (language === 'en') {
        languagePrompt = "CRITICAL LANGUAGE REQUIREMENT: The user has selected ENGLISH as their preferred language. You MUST reply ONLY in English. Do NOT under any circumstances reply in Urdu, Sindhi, or Roman scripts.";
      }

      const systemInstruction = `You are "EcoTrack," an expert AI waste-management assistant for citizens of
Hyderabad, Sindh, Pakistan, built into the EcoTrack app.

${languagePrompt}

CRITICAL SCOPE LIMITATION: You must ONLY answer questions directly related to EcoTrack, waste management, recycling, composting, landfill, trash segregation, and related environmental topics. Do NOT under any circumstances answer general knowledge, coding, homework, math, history, political, celebrity, or unrelated queries. If the user asks about anything outside of EcoTrack and waste management, politely decline to answer, explaining that you are an assistant dedicated exclusively to EcoTrack and waste management.

CRITICAL FORMATTING RULE: Do NOT use double asterisks (**) or single asterisks (*) anywhere in your response for bolding, list bullets, or headers. Write everything in clean, plain text. For example, instead of writing "**Recyclables**", write "RECYCLABLES" or simply "Recyclables". Do not use markdown syntax for bold or italic text under any circumstances.

Speak like a knowledgeable, approachable waste-management and recycling
expert — not a customer-service bot. When a user asks about disposing of
an item, don't just name a bin color: briefly explain WHY it's categorized
that way, mention any relevant local Hyderabad context (collection norms,
common local practices, hazards to be aware of), and if relevant, offer a
practical tip (e.g. how to store it safely until collection, how to
reduce or reuse it before disposal).

Give complete, well-organized answers. Do not artificially cut answers
short — if a topic has a few distinct points (e.g. "how do I dispose of
old batteries" involves handling, storage, AND drop-off options), cover
all of them in clearly separated sentences or short paragraphs. Avoid
one-line non-answers. As a rough guide, most answers should be substantial
enough to fully explain the topic — typically several sentences to a
short paragraph or two — but stop naturally when the explanation is
complete rather than padding for length.

LANGUAGE PREFERENCE ADHERENCE: ${languagePrompt}
If the user's selected preference is not specified, detect the language they write in and reply in that language. Support English, Urdu script, Sindhi script, Roman Urdu, and Roman Sindhi. Never mix scripts within one reply.

If asked about anything unrelated to waste, recycling, composting, or
the environment, politely redirect back to waste-management topics in
one short sentence, in the same language the user used.

Never say you encountered an error or technical issue as part of your
answer content — if something goes wrong, that's handled outside of you.

For hazardous spills, medical waste, or emergencies, tell the user to
contact local municipal authorities directly rather than giving
DIY handling steps.`;

      const chatHistory = messages || [];

      // Set headers for Server-Sent Events (SSE) streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering

      let streamStarted = false;

      // 1. Try Groq chat streaming if Key is present
      if (groqApiKey) {
        try {
          Logger.info('AI', 'Initializing Groq chat stream using llama-3.1-8b-instant...');
          const groqMessages = [
            { role: 'system', content: systemInstruction },
            ...chatHistory.map((msg: any) => ({
              role: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.text
            })),
            { role: 'user', content: currentMessage }
          ];

          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: groqMessages,
              temperature: 0.7,
              max_tokens: 1200,
              stream: true
            })
          });

          if (groqResponse.ok && groqResponse.body) {
            streamStarted = true;
            const reader = groqResponse.body;
            let buffer = '';
            const decoder = new TextDecoder();

            for await (const chunk of reader as any) {
              buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const cleanLine = line.trim();
                if (!cleanLine) continue;
                if (cleanLine === 'data: [DONE]') {
                  continue;
                }
                if (cleanLine.startsWith('data: ')) {
                  const rawJson = cleanLine.slice(6);
                  try {
                    const parsed = JSON.parse(rawJson);
                    const textChunk = parsed.choices?.[0]?.delta?.content;
                    if (textChunk) {
                      res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
                    }
                  } catch (e) {
                    // Ignore partial JSON parsing errors
                  }
                }
              }
            }

            if (buffer) {
              const cleanLine = buffer.trim();
              if (cleanLine.startsWith('data: ') && cleanLine !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(cleanLine.slice(6));
                  const textChunk = parsed.choices?.[0]?.delta?.content;
                  if (textChunk) {
                    res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
                  }
                } catch (e) {}
              }
            }

            res.write('data: [DONE]\n\n');
            res.end();
            Logger.info('AI', 'Groq chat stream completed successfully');
            return;
          } else {
            const errText = await groqResponse.text();
            Logger.warn('AI', `Groq Chat Stream failed with status ${groqResponse.status}: ${errText}. Falling back to Gemini...`);
          }
        } catch (groqErr: any) {
          Logger.warn('AI', 'Failed to run Groq stream, falling back to Gemini:', groqErr.message || groqErr);
        }
      }

      // 2. Fallback to Gemini if Groq is not configured or failed
      if (!streamStarted && ai) {
        Logger.info('AI', 'Initializing Gemini chat stream using gemini-3.5-flash...');
        try {
          const contents = chatHistory.map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.text }]
          }));

          contents.push({
            role: 'user',
            parts: [{ text: currentMessage }]
          });

          const streamResponse = await aiService.getGeminiStreamWithRetry(contents, systemInstruction);
          
          for await (const chunk of streamResponse) {
            if (chunk.text) {
              res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
          }
          res.write('data: [DONE]\n\n');
          res.end();
          streamStarted = true;
          Logger.info('AI', 'Gemini chat stream completed successfully');
        } catch (err: any) {
          Logger.warn('AI', `Gemini stream failed, falling back to local Grok AI: ${err.message || err}`);
        }
      }

      // 3. Ultimate Fallback: Stream Local Smart Grok AI response
      if (!streamStarted) {
        Logger.info('AI', 'Serving local smart Grok AI chat stream fallback...');
        const localResponse = aiService.getLocalChatResponse(currentMessage);
        
        const words = localResponse.split(/(\s+)/);
        for (const word of words) {
          if (word) {
            res.write(`data: ${JSON.stringify({ text: word })}\n\n`);
            await new Promise(resolve => setTimeout(resolve, 15));
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
        Logger.info('AI', 'Local smart Grok AI chat stream completed successfully');
      }

    } catch (error: any) {
      Logger.error('AI', 'Fatal error in AIController.chat handler', error);
      if (!res.headersSent) {
        try {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          
          const currentMsg = req.body?.currentMessage || '';
          const localResponse = aiService.getLocalChatResponse(currentMsg);
          const words = localResponse.split(/(\s+)/);
          for (const word of words) {
            if (word) {
              res.write(`data: ${JSON.stringify({ text: word })}\n\n`);
              await new Promise(resolve => setTimeout(resolve, 15));
            }
          }
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (innerErr) {
          next(innerErr);
        }
      } else {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  }

  /**
   * Fetches the random recycling tip of the day
   */
  public getTipOfTheDay(req: Request, res: Response, next: NextFunction) {
    try {
      Logger.info('AI', 'Fetching recycling tip of the day...');
      const tip = aiService.getRecyclingTipOfTheDay();
      return res.json(tip);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * YOLO based waste detection integration
   */
  public async detectWaste(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new ValidationError('No image file provided in the request.');
      }

      // We might not have auth context depending on current setup, defaulting for now
      const userId = (req as any).user?.uid || 'anonymous';
      
      const { pythonAIService } = require('../services/pythonAIService');
      const { RecommendationService } = require('../services/recommendationService');
      const { FirebaseScanService } = require('../services/firebaseScanService');

      const recommendationService = new RecommendationService();
      const firebaseScanService = new FirebaseScanService();

      Logger.info('AI', 'Starting YOLO waste detection request...');
      
      // 1. Upload to Firebase Storage
      const imageUrl = await firebaseScanService.uploadImage(req.file.buffer, req.file.mimetype, userId);

      // 2. Call Python Service
      const aiResponse = await pythonAIService.detectWaste(req.file.buffer, req.file.originalname, req.file.mimetype);

      if (!aiResponse.success) {
        throw new ApiError('AI Detection failed: ' + aiResponse.error);
      }

      // 3. Process detections and get recommendations
      const formattedDetections: any[] = [];
      let totalEcoPoints = 0;
      let recyclableCount = 0;
      let hazardousCount = 0;
      let organicCount = 0;

      for (const detection of aiResponse.detections) {
        const recommendation = recommendationService.getRecommendation(detection.class_name);
        
        formattedDetections.push({
          ...detection,
          ...recommendation
        });

        totalEcoPoints += recommendation.ecoPoints;
        if (recommendation.recyclable) recyclableCount++;
        if (recommendation.category === 'Hazardous Waste') hazardousCount++;
        if (recommendation.category === 'Food Waste' || recommendation.category === 'Organic') organicCount++;
      }

      const summary = {
        totalObjects: aiResponse.detections.length,
        recyclable: recyclableCount,
        hazardous: hazardousCount,
        organic: organicCount,
        ecoPoints: totalEcoPoints
      };

      // 4. Save to Firestore
      const scanId = await firebaseScanService.saveScan({
        userId,
        imageUrl,
        detections: formattedDetections,
        totalObjects: summary.totalObjects,
        recyclableCount,
        hazardousCount,
        ecoPoints: totalEcoPoints,
        createdAt: new Date()
      });

      Logger.info('AI', 'YOLO waste detection completed successfully', { scanId, totalObjects: summary.totalObjects });

      return res.json({
        success: true,
        scanId,
        detections: formattedDetections,
        summary
      });

    } catch (error: any) {
      Logger.error('AI', 'Error in detectWaste', error);
      return res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }
}

export const aiController = new AIController();
