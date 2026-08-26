const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const multer = require('multer');
const fs = require('fs');
const os = require('os');

const { optionalAuth } = require('../middleware/auth');
const ChatHistory = require('../models/ChatHistory');

const upload = multer({ dest: os.tmpdir() });

// ─────────────────────────────────────────────
// GROQ CLIENT FACTORY (lazy read from process.env)
// ─────────────────────────────────────────────
function getGroqClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.trim().length < 10) {
    throw new Error('Groq API key is not configured in backend .env file.');
  }
  return new Groq({
    apiKey: key.trim(),
  });
}

/**
 * Helper to detect language script / family from text
 */
function detectTextLanguage(text) {
  if (!text || typeof text !== 'string') return { code: 'en-IN', name: 'English' };

  if (/[\u0B80-\u0BFF]/.test(text)) return { code: 'ta-IN', name: 'Tamil' };
  if (/[\u0900-\u097F]/.test(text)) return { code: 'hi-IN', name: 'Hindi' };
  if (/[\u0C00-\u0C7F]/.test(text)) return { code: 'te-IN', name: 'Telugu' };
  if (/[\u0D00-\u0D7F]/.test(text)) return { code: 'ml-IN', name: 'Malayalam' };
  if (/[\u0C80-\u0CFF]/.test(text)) return { code: 'kn-IN', name: 'Kannada' };

  // Common Tanglish detection keywords
  const lower = text.toLowerCase();
  const tanglishPatterns = /\b(sapadu|sapadlama|sapadalam|enaku|unakku|nalla|iruku|irukkum|pannunga|panlama|kudikalam|romba|illa|ille|thara|thanni|saapida|vendam|muttaye|kudunga|sollunga|biscuit-la|unavugal)\b/i;
  if (tanglishPatterns.test(lower)) {
    return { code: 'ta-IN', name: 'Tanglish', isRomanized: true };
  }

  // Common Hinglish detection keywords
  const hinglishPatterns = /\b(khao|khana|karein|hoga|hogi|hai|hain|kya|nahi|mujhe|tumhe|batao|sahi|accha|roti|chawal)\b/i;
  if (hinglishPatterns.test(lower)) {
    return { code: 'hi-IN', name: 'Hinglish', isRomanized: true };
  }

  return { code: 'en-IN', name: 'English' };
}

// ─────────────────────────────────────────────
// GET CHAT HISTORY
// GET /api/chat/history
// ─────────────────────────────────────────────
router.get('/history', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?._id || req.userId || 'guest_user';
    if (userId === 'guest_user') {
      return res.json([]);
    }
    const history = await ChatHistory.findOne({ userId });
    res.json(history ? history.messages : []);
  } catch (error) {
    console.error('Chat history error:', error);
    res.json([]);
  }
});

// ─────────────────────────────────────────────
// POST AUDIO → WHISPER AI SPEECH RECOGNITION (Multilingual STT)
// POST /api/chat/audio
// ─────────────────────────────────────────────
router.post(
  '/audio',
  optionalAuth,
  upload.single('audio'),
  async (req, res) => {
    let newPath = null;
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Audio file is required',
        });
      }

      const groq = getGroqClient();
      newPath = `${req.file.path}.webm`;
      fs.renameSync(req.file.path, newPath);

      // Transcribe with Whisper Large v3 (automatic multilingual detection: Tamil, Hindi, Telugu, Malayalam, Kannada, English, etc.)
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(newPath),
        model: 'whisper-large-v3',
        response_format: 'verbose_json',
      });

      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }

      const text = transcription.text || '';
      const detectedLang = transcription.language || 'english';
      const langMeta = detectTextLanguage(text);

      res.json({
        transcript: text,
        detectedLanguage: langMeta.code,
        languageName: langMeta.name || detectedLang,
      });
    } catch (error) {
      console.error('Whisper Error:', error.message);
      try {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        if (newPath && fs.existsSync(newPath)) {
          fs.unlinkSync(newPath);
        }
      } catch (cleanupError) {
        console.error('Audio cleanup error:', cleanupError.message);
      }

      if (error.message && error.message.includes('API key')) {
        return res.status(500).json({
          error: 'Groq API key is not configured correctly.',
        });
      }

      res.status(500).json({
        error: 'Failed to transcribe audio',
      });
    }
  }
);

// ─────────────────────────────────────────────
// POST CHAT MESSAGE (Multilingual, Allergies, Prescriptions & Safe Alternatives)
// POST /api/chat
// ─────────────────────────────────────────────
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      prompt,
      product,
      userProfile,
      prescriptionInfo,
      scanHistory,
    } = req.body;

    if (
      !prompt ||
      typeof prompt !== 'string' ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        error: 'Prompt is required',
      });
    }

    const groq = getGroqClient();
    const promptLang = detectTextLanguage(prompt);

    // ─────────────────────────────────────────
    // COMPREHENSIVE MULTILINGUAL NUTRITION SYSTEM PROMPT
    // ─────────────────────────────────────────
    let systemPrompt = `You are Foodie AI, an elite AI nutrition advisor, certified clinical food safety expert, and healthy meal planner.

### 🌐 CRITICAL MULTILINGUAL INSTRUCTION:
- Automatically detect the user's language, dialect, and writing script in their latest message.
- ALWAYS respond in the EXACT SAME language and script that the user used:
  • Tamil (தமிழ்) script -> Respond in pure, fluent Tamil (தமிழ்).
  • Tanglish (Tamil words written in English letters, e.g., "ithu nallatha?", "sugar ku enna sapadalam?", "enaku wheat allergy iruku") -> Respond in natural, friendly Tanglish using Latin script!
  • Hindi (हिंदी) script -> Respond in Hindi (हिंदी).
  • Hinglish (Hindi in English letters, e.g., "kya yeh safe hai?") -> Respond in natural Hinglish!
  • Telugu (తెలుగు) script -> Respond in Telugu (తెలుగు).
  • Malayalam (മലയാളം) script -> Respond in Malayalam (മലയാളം).
  • Kannada (ಕನ್ನಡ) script -> Respond in Kannada (ಕನ್ನಡ).
  • English -> Respond in English.
- If the user switches language at any point in the conversation, SWITCH IMMEDIATELY to their new language.
- Translate all nutritional advice, allergen warnings, and food alternative recommendations naturally into that target language.

### CORE MISSION:
- Deliver personalized, scientifically accurate, and empowering food advice.
- Protect the user from allergens, harmful ingredients, and dangerous food-drug interactions.
- ALWAYS recommend 2 to 3 healthy, delicious, and safe food alternatives whenever an asked food or scanned product is unhealthy, low-scoring, allergenic, or incompatible with their prescriptions.
- If the user sends a friendly greeting (like "hi", "vanakkam", "namaste", "hello"), reply with a warm, friendly welcome mentioning how you can help with their diet, allergies, and recipes.
- Provide answers formatted in clean, friendly Markdown with bold highlights and bullet points.
- Keep responses concise, direct, and under 150 words so speech synthesis audio plays smoothly and quickly.
- Never output reasoning blocks or <think> tags.`;

    // ─────────────────────────────────────────
    // USER HEALTH & ALLERGY PROFILE
    // ─────────────────────────────────────────
    if (userProfile) {
      const allergiesList = Array.isArray(userProfile.allergies)
        ? userProfile.allergies.join(', ')
        : (userProfile.allergies || 'None');
      const conditionsList = Array.isArray(userProfile.medicalConditions)
        ? userProfile.medicalConditions.join(', ')
        : (userProfile.medicalConditions || 'None');
      const goalsList = Array.isArray(userProfile.goals)
        ? userProfile.goals.join(', ')
        : (userProfile.goals || 'General Wellness');
      const dietPref = Array.isArray(userProfile.dietaryPreferences)
        ? userProfile.dietaryPreferences.join(', ')
        : (userProfile.dietaryPreferences || userProfile.dietaryPreference || 'Standard');

      systemPrompt += `\n\n### USER PERSONAL HEALTH PROFILE:
- Allergies: ${allergiesList} (CRITICAL: Strictly warn if any food contains or risks these allergens, and provide allergy-safe alternatives in the user's language!)
- Dietary Preference: ${dietPref}
- Health & Fitness Goals: ${goalsList}
- Medical Conditions: ${conditionsList}
- Activity Level: ${userProfile.activityLevel || 'Moderately Active'}`;
    }

    // ─────────────────────────────────────────
    // UPLOADED PRESCRIPTIONS & MEDICATION INTERACTIONS
    // ─────────────────────────────────────────
    if (prescriptionInfo && (Array.isArray(prescriptionInfo) ? prescriptionInfo.length > 0 : Object.keys(prescriptionInfo).length > 0)) {
      const rxItems = Array.isArray(prescriptionInfo) ? prescriptionInfo : [prescriptionInfo];
      const medSummary = rxItems.map((rx) => {
        const medNames = rx.medicines?.map((m) => `${m.name} (${m.dosage || ''})`).join(', ') || 'Prescribed Meds';
        const interactions = rx.foodInteractions?.join('; ') || 'Follow general precautions';
        return `• Meds: ${medNames} | Food Interactions to Avoid: ${interactions}`;
      }).join('\n');

      systemPrompt += `\n\n### USER PRESCRIPTION & MEDICATION CONTEXT:
${medSummary}
(IMPORTANT: Actively check for adverse medicine-food interactions and suggest meals and foods that are 100% safe to consume with these prescriptions!)`;
    }

    // ─────────────────────────────────────────
    // CURRENT / SCANNED PRODUCT CONTEXT
    // ─────────────────────────────────────────
    if (product && product.name) {
      systemPrompt += `\n\n### ACTIVE SCANNED FOOD PRODUCT:
- Name: ${product.name || 'Unknown Product'}
- Brand: ${product.brand || 'Unknown Brand'}
- Health Score: ${product.healthScore !== undefined ? `${product.healthScore}/100` : 'Not rated'}
- Calories: ${product.calories ? `${product.calories} kcal` : 'N/A'}
- Ingredients: ${product.ingredients || 'Ingredients list not specified'}
- Allergens Listed: ${product.allergens || 'None detected'}
(TASK: Analyze this product against the user's allergies, goals, and medications. If it is high in sugar/sodium/preservatives, contains allergens, or conflicts with their meds, clearly explain why and suggest 2-3 specific, healthier alternatives in the requested language!)`;
    }

    // ─────────────────────────────────────────
    // RECENT SCAN HISTORY
    // ─────────────────────────────────────────
    if (Array.isArray(scanHistory) && scanHistory.length > 0) {
      const recentNames = scanHistory.slice(0, 3).map((s) => s.name || s.productName).filter(Boolean).join(', ');
      if (recentNames) {
        systemPrompt += `\n\n### RECENTLY SCANNED PRODUCTS: ${recentNames}`;
      }
    }

    // ─────────────────────────────────────────
    // GET CHAT HISTORY
    // ─────────────────────────────────────────
    const userId = req.user?._id || req.userId || 'guest_user';
    let chatRecord = null;
    let previousMessages = [];

    if (userId !== 'guest_user') {
      try {
        chatRecord = await ChatHistory.findOne({ userId });
        if (!chatRecord) {
          chatRecord = new ChatHistory({ userId, messages: [] });
        }
        previousMessages = chatRecord.messages
          .slice(-8)
          .map((message) => ({
            role: message.role === 'ai' ? 'assistant' : 'user',
            content: message.content,
          }));
      } catch (dbErr) {
        console.warn('DB history lookup warning:', dbErr.message);
      }
    }

    // Add current message
    previousMessages.push({
      role: 'user',
      content: prompt.trim(),
    });

    // ─────────────────────────────────────────
    // GROQ WORKING MODELS LIST
    // ─────────────────────────────────────────
    const CHAT_MODELS = [
      'groq/compound-mini',
      'groq/compound',
      'qwen/qwen3.6-27b',
      'openai/gpt-oss-20b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ];

    let reply = null;
    let lastError = null;

    for (const model of CHAT_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            ...previousMessages,
          ],
          max_tokens: 350,
          temperature: 0.6,
        });

        let rawReply = response?.choices?.[0]?.message?.content || '';

        // Strip reasoning tags
        rawReply = rawReply
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .trim();

        if (rawReply.length > 0) {
          reply = rawReply;
          break;
        }
      } catch (modelError) {
        console.warn(`Groq model ${model} fallback:`, modelError.message?.slice(0, 80));
        lastError = modelError;
      }
    }

    if (!reply) {
      throw lastError || new Error('All Groq chat models failed to produce a response.');
    }

    // Save AI response to DB if user is logged in
    if (chatRecord) {
      try {
        chatRecord.messages.push({ role: 'user', content: prompt.trim() });
        chatRecord.messages.push({ role: 'ai', content: reply });
        await chatRecord.save();
      } catch (saveErr) {
        console.warn('Failed to persist chat record:', saveErr.message);
      }
    }

    const replyLang = detectTextLanguage(reply);

    res.json({
      reply,
      detectedLanguage: replyLang.code || promptLang.code,
      languageName: replyLang.name || promptLang.name,
    });
  } catch (error) {
    console.error('Groq Chat Error:', error.message);

    if (
      error.message &&
      (error.message.includes('API key') ||
        error.message.includes('not configured') ||
        error.message.includes('Unauthorized'))
    ) {
      return res.status(500).json({
        error:
          'Groq API key is not configured correctly in backend .env file.',
      });
    }

    res.status(500).json({
      error: 'Failed to generate AI response. Please try again.',
    });
  }
});

// ─────────────────────────────────────────────
// POST IMAGE → GROQ VISION
// POST /api/chat/vision
// ─────────────────────────────────────────────
router.post('/vision', optionalAuth, async (req, res) => {
  try {
    const { base64Data, mimeType, prompt } = req.body;

    if (!base64Data) {
      return res.status(400).json({
        error: 'Image data is required',
      });
    }

    const groq = getGroqClient();

    const VISION_MODELS = [
      'llama-3.2-90b-vision-preview',
      'llama-3.2-11b-vision-preview',
    ];

    let visionText = null;
    let lastVisionError = null;

    for (const model of VISION_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    prompt ||
                    'Analyze this food product image and identify the product, ingredients, nutrition facts, and allergens in the user requested language.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType || 'image/jpeg'};base64,${base64Data}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 500,
        });

        visionText = response?.choices?.[0]?.message?.content || '';
        if (visionText) break;
      } catch (visionError) {
        lastVisionError = visionError;
      }
    }

    if (!visionText) {
      return res.status(500).json({
        error: 'Groq Vision analysis failed. Please check vision model availability.',
      });
    }

    res.json({
      text: visionText,
    });
  } catch (error) {
    console.error('Groq Vision Error:', error.message);
    res.status(500).json({
      error: 'Failed to analyze image with Groq Vision',
    });
  }
});

// ─────────────────────────────────────────────
// DELETE CHAT HISTORY
// DELETE /api/chat/history
// ─────────────────────────────────────────────
router.delete('/history', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    if (userId && userId !== 'guest_user') {
      await ChatHistory.findOneAndDelete({ userId });
    }
    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Clear chat history error:', error.message);
    res.status(500).json({
      error: 'Failed to clear chat history',
    });
  }
});

module.exports = router;