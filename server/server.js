import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hỗ trợ deploy trên Railway: ghi file credentials từ biến môi trường (nếu có)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credPath = path.join(__dirname, 'vertex-key.json');
  fs.writeFileSync(credPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  console.log('✅ GCP credentials file written from environment variable');
} else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Setup fallback cho local dev: trỏ tới file vertex-key.json trong thư mục server
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'vertex-key.json');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '100mb' }));

/**
 * Get GoogleGenAI instance using Vertex AI (chỉ trừ tiền vào $300 Free Credit)
 */
function getAI() {
  return new GoogleGenAI({
    vertexai: {
      project: process.env.GOOGLE_CLOUD_PROJECT || 'project-fdbf43b8-e8ee-4b6a-90a',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    }
  });
}

/**
 * Normalize contents từ format AI Studio → Vertex AI.
 *
 * AI Studio chấp nhận:  { parts: [...] }  hoặc  [{ parts: [...] }]
 * Vertex AI YÊU CẦU:   [{ role: "user", parts: [...] }]
 *
 * Hàm này tự động bổ sung role nếu thiếu, đảm bảo luôn là Array.
 */
function normalizeContents(contents) {
  // Đã là Array
  if (Array.isArray(contents)) {
    return contents.map(item => ({
      role: item.role && ['user', 'model'].includes(item.role) ? item.role : 'user',
      parts: item.parts ?? [],
    }));
  }
  // Object đơn { parts: [...] }
  if (contents && typeof contents === 'object' && contents.parts) {
    return [{ role: 'user', parts: contents.parts }];
  }
  // Fallback — trả về nguyên để Vertex báo lỗi rõ hơn
  return contents;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Xoá endpoint /api/validate-key vì Vertex AI không kiểm tra API Key đơn lẻ kiểu này nữa.

// Proxy: generateContent (text + image generation)
app.post('/api/generate-content', async (req, res) => {
  try {
    const { model, contents, config } = req.body;

    if (!model || !contents) {
      return res.status(400).json({ error: 'Missing required fields: model, contents' });
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
      candidates: response.candidates?.map(candidate => ({
        content: candidate.content,
        finishReason: candidate.finishReason,
      })) ?? [],
    };

    res.json(result);
  } catch (error) {
    console.error('[generate-content] Error:', error.message);
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Internal server error',
      details: error.details || null,
    });
  }
});

// Proxy: generateContentStream (streaming)
app.post('/api/generate-content-stream', async (req, res) => {
  try {
    const { model, contents, config } = req.body;

    if (!model || !contents) {
      return res.status(400).json({ error: 'Missing required fields: model, contents' });
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
        candidates: chunk.candidates?.map(c => ({
          content: c.content,
          finishReason: c.finishReason,
        })) ?? [],
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('[generate-content-stream] Error:', error.message);
    if (!res.headersSent) {
      res.status(error.status || 500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 F9 Render API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Mode: VERTEX AI (Project: ${process.env.GOOGLE_CLOUD_PROJECT || 'project-fdbf43b8-e8ee-4b6a-90a'})`);
});
