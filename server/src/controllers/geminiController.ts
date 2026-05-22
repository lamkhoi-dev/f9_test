import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { GoogleGenAI } from '@google/genai';
import KeyService from '../services/KeyService';

/**
 * Mô tả ảnh (describe)
 * Model: gemini-2.5-flash / gemini-2.0-flash
 * POST /api/gemini/describe-image
 */
export const describeImage = async (req: AuthRequest, res: Response) => {
  const { imageBase64, mimeType, prompt } = req.body;

  if (!imageBase64 || !mimeType) {
    res.status(400).json({ success: false, message: 'Missing image or mimeType' });
    return;
  }

  try {
    const userCredentialsHeader = req.headers['x-user-credentials'] as string;
    let personalCredentials: any = null;
    let isPersonalAI = false;
    let currentProjectId = '';

    if (userCredentialsHeader) {
      personalCredentials = KeyService.parseUserCredentialsHeader(userCredentialsHeader);
      isPersonalAI = !!personalCredentials;
    }

    let ai;
    if (isPersonalAI) {
      console.log(`🔑 Describe: Using personal AI credentials`);
      ai = KeyService.getCustomVertexAI(personalCredentials);
    } else {
      const vertexConfig = await KeyService.getVertexAIConfig();
      if (!vertexConfig) {
         res.status(503).json({ success: false, message: 'No Vertex AI credentials found' });
         return;
      }
      currentProjectId = vertexConfig.projectId;
      ai = new GoogleGenAI({
        vertexai: true,
        project: vertexConfig.projectId,
        location: vertexConfig.location || 'us-central1',
        googleAuthOptions: { credentials: vertexConfig.credentials },
      });
    }

    // Strip header if present
    const raw = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const modelString = 'gemini-2.5-flash';

    console.log(`🔍 Describe image using model: ${modelString} (Project: ${currentProjectId || 'AI Studio'})`);

    const result = await ai.models.generateContent({
      model: modelString,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: raw } },
          { text: prompt || 'Hãy phân tích chi tiết phong cách kiến trúc, vật liệu, ánh sáng và bối cảnh của bức ảnh này. Trả về kết quả ngắn gọn nhưng đầy đủ để dùng cho bài trí không gian.' }
        ],
      }],
    });

    const candidate = result?.candidates?.[0];
    const text = candidate?.content?.parts?.find((p: any) => p.text)?.text || result?.text || '';

    console.log(`✅ Describe SUCCESS: ${text.slice(0, 50)}...`);

    res.json({
      success: true,
      text,
      data: result
    });

  } catch (error: any) {
    console.error('Describe image error:', error);
    const isPersonalAI = !!req.headers['x-user-credentials'];
    res.status(isPersonalAI ? 400 : 500).json({
      success: false,
      message: isPersonalAI ? `Lỗi AI cá nhân: ${error.message}` : `Lỗi phân tích: ${error.message}`
    });
  }
};
