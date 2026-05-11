/**
 * Legacy Controller — backward compatible endpoints from original server.js
 * 
 * These endpoints maintain the exact API contract the current f9 frontend expects:
 *   POST /api/generate-content
 *   POST /api/generate-content-stream
 * 
 * They do NOT require authentication — they use the server's own Vertex AI credentials.
 */
import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Bootstrap GCP credentials from env (same logic as original server.js)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credPath = path.join(__dirname, '../../vertex-key.json');
  let credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  // Auto-detect base64: if it doesn't start with '{', it's likely base64-encoded
  if (!credJson.trim().startsWith('{')) {
    try {
      credJson = Buffer.from(credJson, 'base64').toString('utf-8');
      console.log('🔓 Decoded base64 credentials');
    } catch (e) {
      console.warn('⚠️ Failed to decode base64 credentials, using as-is');
    }
  }
  
  fs.writeFileSync(credPath, credJson);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  console.log('✅ GCP credentials file written from environment variable');
} else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../vertex-key.json');
}

function getAI(): GoogleGenAI {
  return new GoogleGenAI({
    vertexai: {
      project: process.env.GOOGLE_CLOUD_PROJECT || 'project-fdbf43b8-e8ee-4b6a-90a',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    },
  } as any);
}

/**
 * Normalize contents from AI Studio format → Vertex AI format.
 * AI Studio:  { parts: [...] }  or  [{ parts: [...] }]
 * Vertex AI:  [{ role: "user", parts: [...] }]
 */
function normalizeContents(contents: any): any {
  if (Array.isArray(contents)) {
    return contents.map((item: any) => ({
      role: item.role && ['user', 'model'].includes(item.role) ? item.role : 'user',
      parts: item.parts ?? [],
    }));
  }
  if (contents && typeof contents === 'object' && contents.parts) {
    return [{ role: 'user', parts: contents.parts }];
  }
  return contents;
}

export const legacyGenerateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { model, contents, config } = req.body;

    if (!model || !contents) {
      res.status(400).json({ error: 'Missing required fields: model, contents' });
      return;
    }

    const ai = getAI();
    const normalizedContents = normalizeContents(contents);

    if (config?.imageConfig) {
      console.log(`[generate-content] -> model: ${model} | imageConfig:`, JSON.stringify(config.imageConfig));
    } else {
      console.log(`[generate-content] -> model: ${model} | NO imageConfig`);
    }

    const response = await ai.models.generateContent({ model, contents: normalizedContents, config });

    const result = {
      text: response.text ?? null,
      candidates: response.candidates?.map((candidate: any) => ({
        content: candidate.content,
        finishReason: candidate.finishReason,
      })) ?? [],
    };

    res.json(result);
  } catch (error: any) {
    console.error('[generate-content] Error:', error.message);
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Internal server error',
      details: error.details || null,
    });
  }
};

export const legacyGenerateContentStream = async (req: Request, res: Response): Promise<void> => {
  try {
    const { model, contents, config } = req.body;

    if (!model || !contents) {
      res.status(400).json({ error: 'Missing required fields: model, contents' });
      return;
    }

    const ai = getAI();
    const normalizedContents = normalizeContents(contents);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await ai.models.generateContentStream({ model, contents: normalizedContents, config });

    for await (const chunk of stream) {
      const data = {
        text: chunk.text ?? null,
        candidates: chunk.candidates?.map((c: any) => ({
          content: c.content,
          finishReason: c.finishReason,
        })) ?? [],
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('[generate-content-stream] Error:', error.message);
    if (!res.headersSent) {
      res.status(error.status || 500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};
