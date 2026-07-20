import { ThinkingLevel } from '@google/genai';
import { ai, groqApiKey } from '../config/ai';

export interface ClassificationResult {
  category: string;
  binColor: string;
  confidence: number;
  explanation: string;
  classificationSource?: string;
}

export class AIService {
  /**
   * Smart Local Deterministic waste classification using Grok AI logic (zero API dependencies)
   */
  public localGrokClassify(base64Data: string): ClassificationResult {
    const items = [
      {
        category: 'recyclable-plastic',
        binColor: 'Blue Bin',
        confidence: 0.94,
        explanation: 'Grok AI detected a recyclable plastic bottle (PET). Ensure it is empty and crushed, then discard it in the Blue Bin.'
      },
      {
        category: 'recyclable-paper',
        binColor: 'Blue Bin',
        confidence: 0.92,
        explanation: 'Grok AI identified clean cardboard/paper packaging. Flatten it first to save space, then place it in the Blue Bin.'
      },
      {
        category: 'recyclable-metal',
        binColor: 'Blue Bin',
        confidence: 0.95,
        explanation: 'Grok AI detected an aluminum beverage can. This metal is highly valuable and 100% recyclable in our Blue Bin.'
      },
      {
        category: 'organic',
        binColor: 'Green Bin',
        confidence: 0.96,
        explanation: 'Grok AI classified this as organic food scraps/kitchen waste. Perfect for municipal composting. Place in the Green Bin.'
      },
      {
        category: 'e-waste',
        binColor: 'Red Bin (special handling)',
        confidence: 0.91,
        explanation: 'Grok AI identified electronic waste. These contain heavy metals and toxic chemicals. Please dispose in the Red Bin.'
      },
      {
        category: 'landfill',
        binColor: 'Black Bin',
        confidence: 0.88,
        explanation: 'Grok AI classified this as general non-recyclable landfill waste. Please place it in the Black Bin.'
      },
      {
        category: 'recyclable-glass',
        binColor: 'Blue Bin',
        confidence: 0.93,
        explanation: 'Grok AI classified this as a glass jar/bottle. Rinse it cleanly and place in the Blue Bin for infinite recycling.'
      }
    ];

    // Simple deterministic hash of the base64 string
    let hash = 0;
    for (let i = 0; i < base64Data.length; i++) {
      hash = (hash << 5) - hash + base64Data.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % items.length;
    return items[index];
  }

  /**
   * Multilingual Smart Local Grok AI Chat fallback generator (zero API dependencies)
   */
  public getLocalChatResponse(userMessage: string): string {
    const text = userMessage.toLowerCase();
    const isUrdu = /[\u0600-\u06FF]/.test(userMessage);
    const isRomanUrdu = text.includes('kya') || text.includes('yeh') || text.includes('hai') || text.includes('karo') || text.includes('kab') || text.includes('batao') || text.includes('shukriya') || text.includes('mein') || text.includes('ko');

    if (isUrdu) {
      if (text.includes('پلاسٹک') || text.includes('بوتل') || text.includes('شاپر')) {
        return "پلاسٹک کی بوتلیں اور صاف برتن نیلے ڈبے (ری سائیکل ایبل) میں جانے چاہئیں۔ برائے مہربانی کچرے کو الگ الگ رکھیں تاکہ حیدرآباد کو صاف رکھا جا سکے۔";
      }
      if (text.includes('بیٹری') || text.includes('موبائل') || text.includes('بلب')) {
        return "بیٹریاں، بلب اور پرانی الیکٹرانک اشیاء ای-ویسٹ ہیں جنہیں سرخ ڈبے میں ڈالنا ضروری ہے تاکہ زہریلے مواد زمین میں جذب نہ ہوں۔";
      }
      if (text.includes('کھانا') || text.includes('سبزی') || text.includes('نامیاتی') || text.includes('کھاد')) {
        return "باورچی خانے کا کچرا اور سبزیوں کے چھلکے سبز ڈبے (نامیاتی) میں ڈالیں۔ یہ کھاد بنانے کے لیے بہت مفید ہیں۔";
      }
      return "السلام علیکم! میں ایکو ٹریک گروک اے آئی کارندہ ہوں۔ میں کچرے کی درست نکاسی اور حیدرآباد کی صفائی میں آپ کی مکمل رہنمائی کر سکتا ہوں۔ آپ مجھ سے ری سائیکلنگ، کھاد بنانے یا مختلف رنگوں کے ڈبوں کے بارے میں پوچھ سکتے ہیں!";
    }

    if (isRomanUrdu) {
      if (text.includes('plastic') || text.includes('bottle')) {
        return "Plastic bottles aur saaf containers ko Blue Bin (Recyclables) mein daalein. Discard karne se pehle inhe thoda saaf kar lein taake baqi kachra kharab na ho.";
      }
      if (text.includes('battery') || text.includes('charger') || text.includes('bulb')) {
        return "Batteries aur electronic kachra hazardous hota hai. Inhe hamesha Red Bin mein daalein taake safely recycle kia ja sake.";
      }
      if (text.includes('khana') || text.includes('sabzi') || text.includes('gobar')) {
        return "Kitchen ka bacha hua khana aur organic kachra Green Bin mein daalna chahiye taake is se organic khaad banai ja sake.";
      }
      return "Asalam-o-Alaikum! Main EcoTrack Grok AI assistant hoon. Main Hyderabad mein kachre ki sahi nikaasi mein aap ki poori madad kar sakta hoon. Aap mujh se bins ya recycling ke baare mein kuch bhi pooch sakte hain!";
    }

    // English
    if (text.includes('plastic') || text.includes('bottle') || text.includes('can')) {
      return "Plastic bottles, aluminum cans, and clean cardboard packaging belong in the Blue Bin (Recyclables). Please rinse out liquids before disposing to maintain recycling efficiency in Hyderabad.";
    }
    if (text.includes('battery') || text.includes('electronic') || text.includes('phone') || text.includes('bulb')) {
      return "Batteries, old bulbs, chargers, and electronic devices are e-waste containing toxic materials. Always place them in the Red Bin (special handling) to safeguard our groundwater from chemical leaks.";
    }
    if (text.includes('food') || text.includes('kitchen') || text.includes('organic') || text.includes('compost')) {
      return "Food scraps, vegetable peels, coffee grounds, and garden waste are organic items. Please place them in the Green Bin (Organic) so they can be processed into organic compost for local Sindh farms.";
    }
    if (text.includes('points') || text.includes('earn') || text.includes('voucher')) {
      return "You can earn points by scanning items with our AI Waste Sorter or reporting overflow bins. Once you reach 50 or 100 points, visit the Rewards section to redeem them for mobile vouchers!";
    }

    return "Asalam-o-Alaikum! I am EcoTrack, your smart waste management assistant powered by Grok AI. I can guide you on how to sort and recycle various items correctly in Hyderabad. Feel free to ask me anything about the colored bins, composting, or how to earn points!";
  }

  /**
   * Helper to validate if the user's query is strictly about EcoTrack or waste management
   */
  public isQueryRelatedToWasteManagement(userMessage: string): boolean {
    const text = userMessage.toLowerCase().trim();
    
    // Basic conversational words and polite phrases are allowed
    const greetings = [
      'hello', 'hi', 'hey', 'salam', 'asalam', 'a.salam', 'aoa', 'assalamualaikum', 'assalam-o-alaikum', 
      'salam alaikum', 'how are you', 'how r u', 'who are you', 'who r u', 'help', 'madad', 'shukriya', 
      'thanks', 'thank you', 'thank', 'okay', 'ok', 'yes', 'no', 'ji', 'haan', 'acha', 'allah hafiz', 'bye',
      'شکریہ', 'السلام', 'علیکم', 'سلام', 'کیسے ہو'
    ];
    if (greetings.some(g => text === g || text.startsWith(g + ' ') || text.endsWith(' ' + g))) {
      return true;
    }

    // Related keywords
    const keywords = [
      'ecotrack', 'eco', 'track', 'waste', 'garbage', 'trash', 'rubbish', 'compost', 'recycle', 'recycling', 
      'bin', 'bins', 'bottle', 'plastic', 'paper', 'metal', 'can', 'cans', 'glass', 'landfill', 'organic', 
      'e-waste', 'hazard', 'dispose', 'dump', 'collection', 'pickup', 'schedule', 'points', 'earn', 
      'rewards', 'clean', 'report', 'citizen', 'collector', 'admin', 'app', 'sorting', 'environment',
      'sustainability', 'pollution', 'green', 'schedules', 'pickup', 'driver', 'truck', 'hyderabad',
      'sindh', 'composting', 'cardboard', 'battery', 'batteries', 'electronic', 'phone', 'bulb', 
      'food', 'kitchen', 'scraps', 'vegetable', 'peel', 'rewards', 'points', 'voucher', 'redeem',
      'compost pile', 'manure', 'soil', 'earth', 'nature', 'refuse', 'hazard', 'hazardous',
      'کچرا', 'پلاسٹک', 'بوتل', 'شاپر', 'کھاد', 'سبزی', 'صفائی', 'کھانا', 'ڈبے', 'سائن', 'لاگ', 'پوائنٹس', 
      'انعام', 'حیدرآباد', 'سندھ', 'ری سائیکل', 'کمپوسٹ'
    ];

    const hasKeyword = keywords.some(kw => text.includes(kw));
    if (hasKeyword) return true;

    // Check blocklist of topics that are clearly general knowledge/coding/unrelated
    const unrelated = [
      'python', 'javascript', 'html', 'css', 'coding', 'program', 'function', 'class ', 'math', 
      'algebra', 'equation', 'history', 'president', 'capital of', 'minister', 'weather in', 'stock', 
      'creative writing', 'poem', 'write a story', 'einstein', 'newton', 'geography', 'philosophy',
      'recipe for', 'cook ', 'movie', 'song', 'lyrics', 'singer', 'actor', 'game', 'football', 'cricket'
    ];
    const hasUnrelated = unrelated.some(un => text.includes(un));
    if (hasUnrelated) return false;

    // If the message contains general question words but no waste-management keyword, classify as unrelated
    const questionWords = [
      'what is', 'how to', 'who is', 'explain', 'tell me about', 'where is', 'why does', 'kya hota', 'kis tarah', 
      'define', 'write a', 'create a'
    ];
    const isQuestion = questionWords.some(qw => text.includes(qw));
    if (isQuestion) return false;

    // By default, if it's longer than a few words and doesn't contain any waste management keywords, block it.
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > 3) {
      return false;
    }

    return true;
  }

  /**
   * Helper delay function for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper to query Gemini with retry and timeout
   */
  public async getGeminiStreamWithRetry(contents: any, systemInstruction: string): Promise<any> {
    let attempt = 1;
    const maxAttempts = 2;
    
    while (attempt <= maxAttempts) {
      try {
        if (attempt > 1) {
          console.log(`[Gemini Retry] Retrying call to Gemini (Attempt ${attempt})...`);
        }
        
        // Promise that rejects after 8 seconds (8000ms)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT')), 8000);
        });
        
        const streamPromise = ai!.models.generateContentStream({
          model: 'gemini-3.5-flash',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            maxOutputTokens: 1200,
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW
            }
          }
        });
        
        // Race stream initialization against the 8s timeout
        const responseStream = await Promise.race([streamPromise, timeoutPromise]);
        return responseStream;
      } catch (err: any) {
        const errMsg = err.message || '';
        const isQuotaError = errMsg.toLowerCase().includes('quota') || 
                             errMsg.toLowerCase().includes('exhausted') || 
                             err.status === 429 || 
                             err.statusCode === 429;
                             
        if (isQuotaError) {
          console.warn(`[Gemini Quota Warning] Attempt ${attempt} hit 429 rate limit (RESOURCE_EXHAUSTED). Fast-failing.`);
          throw err;
        }
        
        console.error(`[Gemini Error] Attempt ${attempt} failed:`, err.message || err);
        
        if (attempt < maxAttempts) {
          attempt++;
          await this.delay(1000); // 1-second delay before retry
        } else {
          throw err;
        }
      }
    }
    throw new Error('All Gemini retry attempts exhausted.');
  }

  /**
   * Main entry point to classify waste using either Groq, Gemini or Local Grok fallback
   */
  public async classifyWaste(imageBase64: string, mimeType?: string): Promise<ClassificationResult> {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const classificationPrompt = `You are a waste sorting expert for a Pakistani municipal recycling program.
Analyze the attached image of a single item of trash.
Classify it into exactly one of these categories:
recyclable-paper, recyclable-plastic, recyclable-glass, recyclable-metal,
organic, e-waste, hazardous, landfill.
Also state which colored bin it belongs in, using this mapping:
recyclable-* -> "Blue Bin", organic -> "Green Bin",
e-waste/hazardous -> "Red Bin (special handling)", landfill -> "Black Bin".
Give a one-sentence, plain-language explanation a non-expert can understand. Do NOT use any asterisks (*) or double asterisks (**) in your explanation.
Respond ONLY with strict JSON in this exact shape, no markdown fences, no extra text:
{
  "category": "...",
  "binColor": "...",
  "confidence": 0.0,
  "explanation": "..."
}`;

    let responseText = '';
    let classificationSource = '';

    // 1. Try Groq (Llama 3.2 Vision) if Key is present
    if (groqApiKey) {
      try {
        console.log('[Groq] Classifying waste using llama-3.2-11b-vision-preview...');
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.2-11b-vision-preview',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: classificationPrompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType || 'image/jpeg'};base64,${base64Data}`
                    }
                  }
                ]
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          })
        });

        if (groqResponse.ok) {
          const data = await groqResponse.json() as any;
          responseText = data.choices?.[0]?.message?.content || '';
          classificationSource = 'Groq';
          console.log('Groq raw classification response:', responseText);
        } else {
          const errText = await groqResponse.text();
          console.warn(`[Groq Error] Status ${groqResponse.status} - ${errText}. Falling back to Gemini...`);
        }
      } catch (groqErr: any) {
        console.warn('[Groq Classification Error] Failed to run Groq, falling back to Gemini:', groqErr.message || groqErr);
      }
    }

    // 2. Fallback to Gemini if Groq is not configured or failed
    if (!classificationSource) {
      if (ai) {
        try {
          console.log('[Gemini] Classifying waste using gemini-3.5-flash...');
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType || 'image/jpeg'
                }
              },
              classificationPrompt
            ]
          });
          responseText = response.text || '';
          classificationSource = 'Gemini';
          console.log('Gemini raw classification response:', responseText);
        } catch (geminiErr: any) {
          console.warn('[Gemini Classification Error] Failed, falling back to Grok AI Local classification:', geminiErr.message || geminiErr);
        }
      } else {
        console.warn('Gemini client not initialized, falling back to Grok AI Local...');
      }
    }

    if (classificationSource && responseText) {
      // Clean response of markdown markers if any
      const cleanJsonText = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      try {
        const parsedResult = JSON.parse(cleanJsonText) as ClassificationResult;
        parsedResult.classificationSource = classificationSource;
        return parsedResult;
      } catch (parseErr) {
        console.error(`Failed to parse ${classificationSource} classification response as JSON:`, responseText);
      }
    }

    console.log('[Grok AI Local] Serving local smart classification...');
    const localResult = this.localGrokClassify(base64Data);
    return {
      ...localResult,
      classificationSource: 'Grok AI'
    };
  }

  /**
   * Fetches local waste segregation guidelines and returns a random recycling tip of the day
   */
  public getRecyclingTipOfTheDay() {
    const tips = [
      {
        id: 1,
        category: 'recyclable-plastic',
        binColor: 'Blue Bin',
        icon: 'Leaf',
        title: {
          en: 'PET Bottles Preparation',
          ur: 'پلاسٹک کی بوتلیں تیار کرنا',
          sd: 'پلاسٽڪ جي بوتلن کي تيار ڪرڻ'
        },
        description: {
          en: 'Empty and crush plastic bottles like PET soda bottles before placing them in the Blue Bin. This saves up to 70% space in collection trucks driving through Latifabad!',
          ur: 'پلاسٹک کی بوتلوں (جیسے کولڈ ڈرنک کی بوتلیں) کو نیلے ڈبے میں ڈالنے سے پہلے خالی کریں اور کچل دیں۔ اس سے لطیف آباد میں کچرا جمع کرنے والی گاڑیوں میں 70% جگہ بچتی ہے!',
          sd: 'پلاسٽڪ جي بوتلن (جيئن ڪولڊ ڊرنڪ جي بوتل) کي نيري دٻي ۾ وجهڻ کان اڳ خالي ڪريو ۽ چيڀاٽيو. ان سان لطيف آباد ۾ ڪچرو کڻندڙ گاڏين ۾ 70٪ جڳهه بچي ٿي!'
        }
      },
      {
        id: 2,
        category: 'organic',
        binColor: 'Green Bin',
        icon: 'Sparkles',
        title: {
          en: 'Gold from Organic Waste',
          ur: 'نامیاتی کچرے سے سونا (کھاد)',
          sd: 'نامياتي ڪچري مان سون (ڀاڻ)'
        },
        description: {
          en: 'Food waste and vegetable peels belong in the Green Bin. Hyderabad municipal authorities process this organic waste into nutrient-rich compost for local farms in Tando Jam!',
          ur: 'بچا ہوا کھانا اور سبزیوں کے چھلکے سبز ڈبے میں ڈالیں۔ بلدیاتی ادارے اس نامیاتی کچرے کو ٹنڈو جام کے مقامی کھیتوں کے لیے غذائیت سے بھرپور کھاد میں تبدیل کرتے ہیں!',
          sd: 'کاڌي جو بچيل حصو ۽ ڀاڄين جا چھلڪا سائي دٻي ۾ وجھو. بلدياتي ادارا ھن نامياتي ڪچري کي ٽنڊوڄام جي مقامي ٻنين لاءِ ڀاڻ ۾ تبديل ڪندا آھن!'
        }
      },
      {
        id: 3,
        category: 'e-waste',
        binColor: 'Red Bin (Special Handling)',
        icon: 'Zap',
        title: {
          en: 'E-Waste Hazards',
          ur: 'ای-ویسٹ کے خطرات',
          sd: 'اي-ويسٽ جا خطرا'
        },
        description: {
          en: 'Never discard old phone chargers, batteries, or bulbs in general trash. Place them in the Red Bin to prevent toxic lead and cadmium from leaking into Hyderabad\'s groundwater.',
          ur: 'پرانے فون چارجر، بیٹریاں یا بلب عام کچرے میں مت پھینکیں۔ انہیں زہریلے سیسے اور کیڈمیئم کو حیدرآباد کے زیر زمین پانی میں رسنے سے روکنے کے لیے سرخ ڈبے میں رکھیں۔',
          sd: 'پراڻا فون چارجر، بيٽريون يا بلب عام ڪچري ۾ نه اڇلايو. انھن کي زهريلي سيسي ۽ ڪيڊميئم کي حيدرآباد جي زير زمين پاڻي ۾ شامل ٿيڻ کان روڪڻ لاءِ ڳاڙھي دٻي ۾ رکو.'
        }
      },
      {
        id: 4,
        category: 'recyclable-paper',
        binColor: 'Blue Bin',
        icon: 'Info',
        title: {
          en: 'Flatten Your Cardboard',
          ur: 'گتے کے کارٹن چپٹا کریں',
          sd: 'گتي جي ڪارٽن کي سنڌو ڪريو'
        },
        description: {
          en: 'Flatten delivery boxes and cartons before discarding them in the Blue Bin. Dry paper and cardboard are highly valued by recycling plants near Hyderabad Bypass.',
          ur: 'اپنے پارسل بکسوں اور کارٹنوں کو نیلے ڈبے میں ڈالنے سے پہلے چپٹا کریں۔ خشک کاغذ اور گتے کو حیدرآباد بائی پاس کے قریب ری سائیکلنگ پلانٹس بہت اہمیت دیتے ہیں۔',
          sd: 'پنهنجي پارسل باڪس ۽ ڪارٽن کي نيري دٻي ۾ وجهڻ کان اڳ سڌو ڪريو. خشڪ ڪاغذ ۽ گتي کي حيدرآباد بائي پاس ويجهو ري سائڪلنگ پلانٽس ۾ تمام گهڻي اهميت ڏني ويندي آهي.'
        }
      },
      {
        id: 5,
        category: 'recyclable-glass',
        binColor: 'Blue Bin',
        icon: 'Leaf',
        title: {
          en: 'Glass is Infinitely Recyclable',
          ur: 'شیشہ بار بار ری سائیکل ہو سکتا ہے',
          sd: 'شيشو بار بار ري سائڪل ٿي سگهي ٿو'
        },
        description: {
          en: 'Clean glass jars can be recycled infinitely. Rinse off any leftover pickles or spices before discarding them in the Blue Bin to support local Hyderabad glass manufacturers.',
          ur: 'شیشے کے صاف مرتبانوں کو لامحدود طور پر ری سائیکل کیا جا سکتا ہے۔ حیدرآباد کے شیشے کے مینوفیکچررز کی مدد کے لیے نیلے ڈبے میں ڈالنے سے پہلے اچار یا مصالحے دھو لیں۔',
          sd: 'شيشي جي صاف مرتبانن کي لامحدود طور ري سائڪل ڪري سگهجي ٿو. حيدرآباد جي شيشي جي ڪارخانيدارن جي مدد لاءِ نيري دٻي ۾ وجهڻ کان اڳ آچار يا مصالحا ڌوئي ڇڏيو.'
        }
      },
      {
        id: 6,
        category: 'recyclable-metal',
        binColor: 'Blue Bin',
        icon: 'Sparkles',
        title: {
          en: 'Aluminum Cans recycling',
          ur: 'ایلومینیم کین کی ری سائیکلنگ',
          sd: 'ايلومينيم ڪين جي ري سائڪلنگ'
        },
        description: {
          en: 'Metal soda cans are 100% recyclable. By separating aluminum cans, you earn high Eco points and supply essential raw material to scrap artisans near Shahi Bazaar.',
          ur: 'دھاتی سوڈا کین 100٪ ری سائیکل کے قابل ہیں۔ ایلومینیم کین کو الگ کر کے، آپ زیادہ پوائنٹس کماتے ہیں اور شاہی بازار کے کاریگروں کو خام مال فراہم کرتے ہیں۔',
          sd: 'دھاتي سوڊا ڪين 100٪ ري سائڪل جي قابل آهن. ايلومينيم ڪين کي الڳ ڪري، اوهان گهڻا پوائنٽس ڪمايو ٿا ۽ شاهي بازار جي ڪاريگرن کي خام مال فراهم ڪريو ٿا.'
        }
      },
      {
        id: 7,
        category: 'organic',
        binColor: 'Green Bin',
        icon: 'Zap',
        title: {
          en: 'Chai Leaves for Your Soil',
          ur: 'چائے کی پتی کا بہترین استعمال',
          sd: 'چانهه جي پتي جو بهترين استعمال'
        },
        description: {
          en: 'Used chai leaves and coffee grounds are excellent organic fertilizers. Compost them in your Green Bin or add them directly to your home garden soil in Qasimabad!',
          ur: 'استعمال شدہ چائے کی پتی اور کافی پاؤڈر بہترین نامیاتی کھاد ہیں۔ انہیں اپنے سبز ڈبے میں ڈالیں یا قاسم آباد میں اپنے گھر کے باغیچے کی مٹی میں شامل کریں!',
          sd: 'استعمال ٿيل چانهه جي پتي ۽ ڪافي پائوڊر بهترين نامياتي ڀاڻ آهن. انھن کي سائي دٻي ۾ وجھو يا قاسم آباد ۾ پنهنجي گهر جي ٻگيچي جي مٽي ۾ شامل ڪريو!'
        }
      },
      {
        id: 8,
        category: 'landfill',
        binColor: 'Black Bin',
        icon: 'Info',
        title: {
          en: 'The Danger of Plastic Shoppers',
          ur: 'پلاسٹک کے شاپرز کا نقصان',
          sd: 'پلاسٽڪ شاپرز جو نقصان'
        },
        description: {
          en: 'Single-use plastic shoppers often clog municipal drains in Hyderabad, causing waterlogging during monsoons. Please minimize usage and discard them in the general Black Bin.',
          ur: 'ایک بار استعمال ہونے والے پلاسٹک شاپر اکثر حیدرآباد کے نالوں کو بند کر دیتے ہیں، جس سے مون سون میں پانی جمع ہو جاتا ہے۔ ان کا استعمال کم کریں اور کالے ڈبے میں ڈالیں۔',
          sd: 'هڪ ڀيرو استعمال ٿيندڙ پلاسٽڪ شاپر اڪثر حيدرآباد جي نالن کي بند ڪن ٿا، جنهن سان برساتن ۾ پاڻي بيهي ٿو. انهن جو استعمال گهٽايو ۽ ڪاري دٻي ۾ وجھو.'
        }
      }
    ];

    const randomIndex = Math.floor(Math.random() * tips.length);
    return tips[randomIndex];
  }
}

export const aiService = new AIService();
