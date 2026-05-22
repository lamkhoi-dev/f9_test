import { GoogleGenAI } from '@google/genai';
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import KeyService from '../services/KeyService';

// Gemini models for analysis (vision + text brainstorming)
const ANALYSIS_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

/**
 * Get a ready GoogleGenAI instance using the same credential chain as aiController:
 * 1. Active VertexKey from DB (excluding specific broken keys)
 * 2. Env var credentials (GOOGLE_APPLICATION_CREDENTIALS_JSON)
 */
async function getAI(req: AuthRequest): Promise<{ ai: any; keyId: number } | null> {
  const userCredentialsHeader = req.headers['x-user-credentials'] as string;
  if (userCredentialsHeader) {
    const personalCredentials = KeyService.parseUserCredentialsHeader(userCredentialsHeader);
    if (personalCredentials) {
      console.log(`🔑 Using personal AI credentials`);
      const ai = KeyService.getCustomVertexAI(personalCredentials);
      return { ai, keyId: 0 };
    }
  }

  // Try active key from DB first
  const vertex = await KeyService.getVertexAI();
  if (vertex?.ai && vertex.keyId !== 9) {
    console.log(`🔑 analyzeController [v4]: using VertexKey id=${vertex.keyId}`);
    return { ai: vertex.ai, keyId: vertex.keyId };
  }

  // Fallback: env var credentials
  const cfg = await KeyService.getVertexAIConfig();
  if (cfg?.credentials && cfg?.projectId) {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: cfg.projectId,
      location: cfg.location || 'us-central1',
      googleAuthOptions: { credentials: cfg.credentials },
    });
    console.log(`🔑 analyzeController [v4]: using env-var creds (project=${cfg.projectId})`);
    return { ai, keyId: 0 };
  }

  return null;
}


/**
 * POST /api/ai/analyze
 * Synchronous Gemini vision analysis via SDK — used for reference image analysis,
 * style extraction, filter detection. Does NOT go through Gommo queue.
 */
export const analyzeContent = async (req: AuthRequest, res: Response) => {
  const { parts, prompt, responseMimeType, responseSchema, mimeType, imageBase64 } = req.body;

  // Build parts array
  let contentParts: any[] = [];
  if (parts && Array.isArray(parts)) {
    contentParts = parts;
  } else {
    if (imageBase64 && mimeType) {
      // Strip data: header if present
      const raw = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      contentParts.push({ inlineData: { mimeType, data: raw } });
    }
    if (prompt) {
      contentParts.push({ text: prompt });
    }
  }

  if (contentParts.length === 0) {
    res.status(400).json({ success: false, message: 'No content to analyze' });
    return;
  }

  // Detect if this is a text-only brainstorming request (no images)
  const hasImage = contentParts.some((p: any) => p.inlineData && p.inlineData.data);
  if (!hasImage) {
    console.log(`🧠 Brainstorming Mode: Analyzing text-only prompt...`);
  }

  let vertex;
  try {
    vertex = await getAI(req);
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: `Lỗi cấu hình AI cá nhân: ${err.message}`,
    });
    return;
  }

  if (!vertex?.ai) {
    res.status(503).json({
      success: false,
      message: 'Không có credentials AI khả dụng để phân tích.',
    });
    return;
  }

  const genConfig: any = { temperature: 1, maxOutputTokens: 4096 };
  if (responseMimeType) genConfig.responseMimeType = responseMimeType;
  if (responseSchema) genConfig.responseSchema = responseSchema;

  // Try each model in order
  let lastError: any = null;
  const model = ANALYSIS_MODELS[0];
  try {
    console.log(`🔍 Analyze → SDK (model=${model}, parts=${contentParts.length})`);

    const result = await vertex.ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: contentParts }],
      config: genConfig,
    });

    const textPart = result?.candidates?.[0]?.content?.parts?.find((p: any) => p.text);
    const text = textPart?.text || result?.text || '';

    console.log(`✅ Analyze SUCCESS (model=${model}, chars=${text.length})`);
    
    // Increment usage if it's a DB key
    if (vertex.keyId) {
      const { default: KeyService } = require('../services/KeyService');
      KeyService.incrementUsage(vertex.keyId);
    }

    res.json({ success: true, text, data: result });
    return;
  } catch (err: any) {
    lastError = err;
    console.warn(`⚠️ Analyze model ${model} failed: ${err.message?.slice(0, 120)}`);
  }


  let errMsg = lastError?.message || 'Unknown error';
  try {
    if (typeof errMsg === 'string') {
      const jsonMatch = errMsg.match(/(\{.*\})/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.error && parsed.error.message) {
          errMsg = parsed.error.message;
        }
      }
    }
  } catch (e) {
    // Ignore
  }

  console.error('analyzeContent: all models failed.', errMsg);

  if (req.headers['x-user-credentials']) {
    res.status(400).json({
      success: false,
      message: `Lỗi AI cá nhân: ${errMsg}`,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: `Không thể phân tích ảnh tham chiếu: ${errMsg.slice(0, 100)}`,
  });
};
