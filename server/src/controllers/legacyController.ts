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

function getAI(personalCredentials?: any): GoogleGenAI {
  if (personalCredentials) {
    // Personal key mode: use user's own GCP service account
    return new GoogleGenAI({
      vertexai: true,
      project: personalCredentials.project_id,
      location: personalCredentials.location || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      googleAuthOptions: { credentials: personalCredentials },
    } as any);
  }
  // System mode: use Railway server-side Vertex AI credentials
  return new GoogleGenAI({
    vertexai: {
      project: process.env.GOOGLE_CLOUD_PROJECT || 'project-fdbf43b8-e8ee-4b6a-90a',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    },
  } as any);
}

/**
 * Parse and validate personal credentials from x-user-credentials header (base64-encoded JSON).
 * - Header absent → null (use system credentials)
 * - Header present + valid service account → { ok: true, credentials }
 * - Header present + invalid → { ok: false, error } (caller should return 400)
 */
function parsePersonalCredentials(req: Request): { ok: true; credentials: any } | { ok: false; error: string } | null {
  const header = req.headers['x-user-credentials'] as string | undefined;
  if (!header) return null; // No personal key — use system credentials

  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (parsed.type === 'service_account' && parsed.project_id && parsed.client_email && parsed.private_key) {
      return { ok: true, credentials: parsed };
    }
    const missing = ['type', 'project_id', 'client_email', 'private_key'].filter(f => !parsed[f]);
    return { ok: false, error: `Service Account JSON không hợp lệ — thiếu trường: ${missing.join(', ') || 'type phải là "service_account"'}` };
  } catch (e) {
    return { ok: false, error: 'Credentials không phải JSON hợp lệ. Vui lòng tải đúng file Service Account JSON từ Google Cloud Console.' };
  }
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

    const parsed = parsePersonalCredentials(req);
    if (parsed !== null && !parsed.ok) {
      res.status(401).json({ error: (parsed as { ok: false; error: string }).error });
      return;
    }
    const personalCredentials = parsed ? (parsed as { ok: true; credentials: any }).credentials : null;
    const ai = getAI(personalCredentials);
    const normalizedContents = normalizeContents(contents);

    if (personalCredentials) {
      console.log(`[generate-content] -> model: ${model} | 🔑 PERSONAL key (project=${personalCredentials.project_id})`);
    } else if (config?.imageConfig) {
      console.log(`[generate-content] -> model: ${model} | imageConfig:`, JSON.stringify(config.imageConfig));
    } else {
      console.log(`[generate-content] -> model: ${model} | NO imageConfig (system credentials)`);
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
    let errMsg = error.message || 'Internal server error';
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
      // Ignore parse error
    }

    console.error('[generate-content] Error:', errMsg);
    const status = error.status || 500;
    res.status(status).json({
      error: errMsg,
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

    const parsedStream = parsePersonalCredentials(req);
    if (parsedStream !== null && !parsedStream.ok) {
      res.status(401).json({ error: (parsedStream as { ok: false; error: string }).error });
      return;
    }
    const personalCredentials = parsedStream ? (parsedStream as { ok: true; credentials: any }).credentials : null;
    const ai = getAI(personalCredentials);
    const normalizedContents = normalizeContents(contents);
    if (personalCredentials) {
      console.log(`[generate-content-stream] -> model: ${model} | 🔑 PERSONAL key (project=${personalCredentials.project_id})`);
    }

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
    let errMsg = error.message;
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
    
    console.error('[generate-content-stream] Error:', errMsg);
    if (!res.headersSent) {
      res.status(error.status || 500).json({ error: errMsg });
    } else {
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      res.end();
    }
  }
};
