import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '100mb' }));

/**
 * Get GoogleGenAI instance per-request.
 * Priority: x-api-key header > VERTEX_API_KEY env
 */
function getAI(req) {
  const key = req.headers['x-api-key'] || process.env.VERTEX_API_KEY;
  if (!key) {
    const err = new Error('No API key provided. Please set your key in the app settings.');
    err.status = 401;
    throw err;
  }
  return new GoogleGenAI({ apiKey: key });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Validate API key
app.post('/api/validate-key', async (req, res) => {
  try {
    const key = req.headers['x-api-key'];
    if (!key) {
      return res.status(400).json({ error: 'Missing x-api-key header' });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    // Light call to verify the key works
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Reply with exactly: OK',
      config: { maxOutputTokens: 5 },
    });

    console.log(`[validate-key] ✅ Key valid (${key.slice(0, 6)}...${key.slice(-4)})`);
    res.json({ valid: true });
  } catch (error) {
    console.error(`[validate-key] ❌ Invalid key:`, error.message);
    res.status(401).json({ valid: false, error: error.message || 'Invalid API key' });
  }
});

// Proxy: generateContent (text + image generation)
app.post('/api/generate-content', async (req, res) => {
  try {
    const { model, contents, config } = req.body;

    if (!model || !contents) {
      return res.status(400).json({ error: 'Missing required fields: model, contents' });
    }

    const ai = getAI(req);

    if (config?.imageConfig) {
      console.log(`[generate-content] -> model: ${model} | imageConfig:`, JSON.stringify(config.imageConfig));
    } else {
      console.log(`[generate-content] -> model: ${model} | NO imageConfig`);
    }

    const response = await ai.models.generateContent({ model, contents, config });

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

    const ai = getAI(req);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await ai.models.generateContentStream({ model, contents, config });

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
  console.log(`   Fallback Key: ${process.env.VERTEX_API_KEY ? '✅ Configured' : '⚠️  Not set (user key required)'}`);
});
