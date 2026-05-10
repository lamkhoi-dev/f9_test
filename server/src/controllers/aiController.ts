import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import UsageService from '../services/UsageService';
import KeyService from '../services/KeyService';
import GommoService from '../services/GommoService';
import VertexDirectService from '../services/VertexDirectService';

/**
 * Translate a Vietnamese architectural prompt to English before
 * sending it to Imagen 3. Imagen is an English-trained model and
 * will hallucinate (dogs, birds, people) when given Vietnamese text.
 */
async function translateForImagen(prompt: string, ai: any): Promise<string> {
  // Skip translation if prompt is already predominantly English
  const vietnameseCharRatio = (prompt.match(/[àáảãạăắặẳẵâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/gi) || []).length / prompt.length;
  if (vietnameseCharRatio < 0.03) {
    console.log(`📎 Prompt is already English (VI ratio=${(vietnameseCharRatio*100).toFixed(1)}%), skipping translation.`);
    return prompt;
  }

  try {
    const translationModel = 'gemini-2.5-flash';
    const translationPrompt = `You are a professional architectural rendering prompt translator. Translate the following architectural description from Vietnamese to English. Keep all technical terms, material names, and style descriptors precise. Output ONLY the translated prompt, nothing else.\n\nVietnamese prompt:\n${prompt}`;
    
    const result = await ai.models.generateContent({
      model: translationModel,
      contents: [{ role: 'user', parts: [{ text: translationPrompt }] }],
      config: { temperature: 0.1, maxOutputTokens: 1024 },
    });
    
    const translated = result?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text?.trim();
    if (translated && translated.length > 10) {
      console.log(`🌐 Translated prompt (${prompt.length}→${translated.length} chars): "${translated.slice(0, 150)}..."`);
      return translated;
    }
  } catch (e: any) {
    console.warn(`⚠️ Translation failed (${e.message?.slice(0,100)}), using original prompt`);
  }

  return prompt;
}

export const generateImage = async (req: AuthRequest, res: Response) => {
  const { prompt, config, contents } = req.body;
  const user = req.user;
  const imageCount = config?.imageCount || 1;

  if (!user || !user.id) {
    res.status(401).json({ success: false, message: 'Người dùng không hợp lệ' });
    return;
  }

  if (!prompt && !contents) {
    res.status(400).json({ success: false, message: 'Prompt hoặc contents là bắt buộc' });
    return;
  }

  // Model mapping
  let modelName = req.body.model || 'gemini-2.5-flash';
  const legacyModels = [
    'google_image_gen_banana', 'google_image_gen_banana_pro',
    'imagen-3.0-generate-001', 'imagen-3.0-generate-002',
    'image-generation@006', 'imagegeneration@006',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.0-flash-exp', 'gemini-2.0-flash',
  ];
  if (legacyModels.includes(modelName)) {
    modelName = 'gemini-2.5-flash';
  }
  
  const resolution = config?.imageConfig?.imageSize || '1k';
  console.log(`🤖 AI Request (v3-async): model=${modelName}, resolution=${resolution}, user=${user?.id}`);

  // 0. Check for User-provided Credentials (API Key or Service Account JSON)
  const userCredentialsHeader = req.headers['x-user-credentials'] as string;
  let personalCredentials: any = null;
  let isPersonalAI = false;

  if (userCredentialsHeader) {
    try {
      // Try to parse as JSON (user might send raw or base64)
      if (userCredentialsHeader.startsWith('{')) {
        personalCredentials = JSON.parse(userCredentialsHeader);
      } else {
        // Assume base64 if not starting with {
        const decoded = Buffer.from(userCredentialsHeader, 'base64').toString('utf-8');
        personalCredentials = JSON.parse(decoded);
      }
      isPersonalAI = true;
    } catch (e) {
      // Fallback: If not JSON/base64 JSON, it's a legacy API Key string
      personalCredentials = userCredentialsHeader;
      isPersonalAI = !!personalCredentials;
    }
  }

  let ai: any;
  let keyId: number = 0;
  let usage: any = { canProceed: true, usageLogId: null };

  // 1. Prepare parts (needed for both flows or for logging)
  let parts: any[];
  if (contents) {
    const rawParts = contents.parts || (Array.isArray(contents) ? contents[0]?.parts : undefined);
    parts = rawParts || [{ text: prompt || '' }];
  } else {
    parts = [{ text: prompt }];
  }

  if (isPersonalAI) {
    // Bypass billing and system key rotation
    ai = KeyService.getCustomVertexAI(personalCredentials);
    console.log(`🚀 Using Personal AI Credentials for user ${user?.id}`);
  } else {
    // 1. Check & Prepare Usage (Pre-flight) - Standard Billing
    const priceKey = config?.priceKey;
    const service = config?.service;
    const page = config?.page;
    
    // NEVER store base64 image data in DB — only log the text prompt
    // Base64 payloads are 2-5MB each and will exhaust disk space rapidly
    let inputData = prompt || '[image-only request]';
    const imagePartCount = (parts || []).filter((p: any) => p.inlineData).length;
    if (imagePartCount > 0) {
      inputData = `[${imagePartCount} image(s)] ${prompt || ''}`.slice(0, 500);
    }

    usage = await UsageService.checkAndPrepareUsage(
      user.id, 
      modelName, 
      resolution, 
      priceKey, 
      service,
      page,
      config,
      inputData,
      imageCount
    );
    if (!usage.canProceed) {
      res.status(402).json({ success: false, message: usage.message });
      return;
    }

    // 2. Get AI Instance — try active key first, then env-var credentials
    const vertex = await KeyService.getVertexAI();
    if (vertex && vertex.keyId !== 9) {
      ai = vertex.ai;
      keyId = vertex.keyId;
      console.log(`🔑 aiController [v4]: using VertexKey id=${keyId}`);
    } else {

      // Fallback: build AI instance from env vars (GOOGLE_APPLICATION_CREDENTIALS_JSON)
      const vertexConfig = await KeyService.getVertexAIConfig();
      if (vertexConfig?.credentials && vertexConfig?.projectId) {
        const { GoogleGenAI } = await import('@google/genai');
        ai = new GoogleGenAI({
          vertexai: true,
          project: vertexConfig.projectId,
          location: vertexConfig.location || 'us-central1',
          googleAuthOptions: { credentials: vertexConfig.credentials },
        });
        console.log(`🔑 Using env-var credentials (project=${vertexConfig.projectId})`);
      } else {
        console.warn('⚠️ No AI credentials available — will fallback to Gommo');
      }
    }
  }

  try {
    const partsText = (parts || []).filter((p: any) => p.text).map((p: any) => p.text).join(' ').trim();
    const finalPrompt = prompt || partsText || '';
    const imageModel = (modelName || '').toLowerCase();
    const hasImageParts = (parts || []).some((p: any) => p.inlineData);

    // ─────────────────────────────────────────────────────────
    // PATH 1: ANALYSIS TASKS — text/JSON output, use SDK directly
    // ─────────────────────────────────────────────────────────
    const isAnalysisTask = config?.responseMimeType === 'application/json' ||
                           config?.page === 'image-generation-analysis' ||
                           (!config?.responseModalities?.includes('IMAGE') && imageModel.includes('gemini'));

    if (isAnalysisTask && ai) {
      const analysisModel = 'gemini-2.5-flash';
      console.log(`🔍 Analysis → SDK direct (model=${analysisModel})`);

      const genConfig: any = { temperature: 0.8, maxOutputTokens: 4096 };
      if (config?.responseMimeType) genConfig.responseMimeType = config.responseMimeType;
      if (config?.responseSchema) genConfig.responseSchema = config.responseSchema;

      const result = await ai.models.generateContent({
        model: analysisModel,
        contents: [{ role: 'user', parts }],
        config: genConfig,
      });

      // Explicitly extract text for the frontend (which expects response.data.text)
      const text = result?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || "";
      console.log(`✅ Analysis complete (${text.length} chars)`);
      res.json({ success: true, text, data: result });
      return;
    }

    // ─────────────────────────────────────────────────────────
    // PATH 2: IMAGE GENERATION — Imagen 3 via generateImages()
    // Model: imagen-3.0-generate-001
    // Input image passed via referenceImages
    // ─────────────────────────────────────────────────────────
    const wantsImage = config?.responseModalities?.includes('IMAGE') ||
                       imageModel.includes('imagen') || imageModel.includes('image-generation') ||
                       imageModel.includes('banana_pro') || imageModel.includes('flash-exp') ||
                       imageModel.includes('flash-preview-image') || imageModel.includes('image-preview');

    const isImagenModel = imageModel.includes('imagen') || imageModel.includes('image-generation') || 
                          imageModel.includes('banana_pro');

    // Log the decision tree for debugging
    console.log(`📊 Route Decision: wantsImage=${wantsImage}, isImagenModel=${isImagenModel}, hasImageParts=${hasImageParts}, hasAI=${!!ai}`);
    console.log(`📝 Prompt (first 200 chars): "${finalPrompt.slice(0, 200)}"`);

    // ─────────────────────────────────────────────────────────
    // PATH 2: IMAGE GENERATION — Imagen 3 via REST API (predict endpoint)
    // Uses VertexDirectService for direct HTTP calls with Bearer token.
    // SDK generateImages() is unreliable — this calls the REST API directly.
    // ─────────────────────────────────────────────────────────
    if (wantsImage) {
      const aspectRatio = config?.imageConfig?.aspectRatio || '1:1';
      console.log(`🖼️ PATH: Imagen 3 generation...`);
      try {
        // 1. Identify "Base Image" (Structure) and "Style Image" from parts
        const imageParts = (parts || []).filter((p: any) => p.inlineData && p.inlineData.data);
        const baseImageBase64 = imageParts[0]?.inlineData?.data;
        const baseImageMimeType = imageParts[0]?.inlineData?.mimeType || 'image/jpeg';
        
        const styleImageBase64 = imageParts[1]?.inlineData?.data;
        const styleImageMimeType = imageParts[1]?.inlineData?.mimeType || 'image/jpeg';

        // 2. Prepare Prompt
        let imagenPrompt = finalPrompt;
        if (ai) {
          imagenPrompt = await translateForImagen(finalPrompt, ai);
        }

        // Clean the prompt
        const cleanedPrompt = imagenPrompt
          .replace(/^(INPUT IMAGE|ẢNH ĐẦU VÀO)[^:]*:\s*/gim, '')
          .replace(/^(STYLE REFERENCE IMAGE|ẢNH THAM CHIẾU[^:]*)[^:]*:\s*/gim, '')
          .replace(/^(FILTER REFERENCE|BỘ LỌC[^:]*)[^:]*:\s*/gim, '')
          .trim();

        const isInterior = /interior|nội thất|phòng|không gian trong/i.test(cleanedPrompt);
        const typePrefix = isInterior
          ? 'High-end interior architectural photography, soft natural lighting, 8k RAW, hyper-realistic textures, authentic materials, neutral color balance'
          : 'Professional exterior architectural photography, soft natural overcast lighting, raw photo, muted organic tones, realistic concrete and wood grain textures, high-end magazine quality';
        
        // Negative prompt — quality and artifact prevention
        const negativePrompt = 'watercolor, oil painting, paint strokes, brush texture, acrylic, pastel, artistic, impressionist, sketch lines, pencil marks, cartoon, illustration, 3d render, CGI, digital art, plastic textures, oversaturated, vibrant neon, glowing, fake, blurry, watermark, low quality, distorted architecture, different layout, modified structure, extra floors, missing windows, altered proportions, noisy, grainy, rough edges, painterly';

        // ── PROMPT CONSTRUCTION ──
        // CONTROL mode: structure locked by edge map, STYLE image NOT sent (incompatible).
        // All style info comes from cleanedPrompt text. [1] = Control image (sketch).
        let finalImagenPrompt: string;

        if (baseImageBase64) {
          // CONTROL mode: Reference [1] only. Smooth photorealism prompt.
          finalImagenPrompt = isInterior
            ? `Crisp, clean, ultra-high-resolution photograph of the interior space shown in [1]. ${cleanedPrompt ? cleanedPrompt + '.' : ''} Smooth polished surfaces, clean sharp edges, professional interior photography with soft even studio lighting, no noise or grain, pristine materials with accurate reflections, 8K DSLR quality, crystal clear details, magazine-quality smooth finish.`
            : `Crisp, clean, ultra-high-resolution photograph of the building shown in [1]. ${cleanedPrompt ? cleanedPrompt + '.' : ''} Smooth clean concrete and glass surfaces, sharp architectural edges, professional architectural photography with soft natural daylight, no noise or grain, pristine building facade, lush green landscaping, clear blue sky, 8K DSLR quality, crystal clear details, magazine-quality smooth finish.`;
        } else {
          // TEXT-ONLY: No input image, full prompt-driven generation
          finalImagenPrompt = `${typePrefix}. ${cleanedPrompt}`;
        }
        console.log(`📝 Final imagen prompt: "${finalImagenPrompt.slice(0, 200)}..."`);

        let result;
        if (baseImageBase64) {
          // IMAGE-TO-IMAGE: CONTROL mode locks geometry via edge map
          console.log(`📡 Using editImage (CONTROL mode) for structural preservation...`);
          result = await VertexDirectService.editImage({
            prompt: finalImagenPrompt,
            negativePrompt,
            aspectRatio: aspectRatio === 'auto' ? '1:1' : aspectRatio,
            imageBase64: baseImageBase64,
            imageMimeType: baseImageMimeType,
            styleImageBase64: styleImageBase64,
            styleImageMimeType: styleImageMimeType,
            numberOfImages: imageCount || 1,
            useControlMode: true,
            controlType: 'CONTROL_TYPE_SCRIBBLE',
          });
        } else {
          // TEXT-TO-IMAGE (New Creation)
          console.log(`📡 Using generateImage (txt2img)...`);
          result = await VertexDirectService.generateImage({
            prompt: finalImagenPrompt,
            negativePrompt,
            aspectRatio: aspectRatio === 'auto' ? '1:1' : aspectRatio,
            model: 'imagen-3.0-generate-001',
            numberOfImages: imageCount || 1,
          });
        }

        // Upload to Gommo CDN
        let finalData: any = result;
        try {
          const firstCandidate = result.candidates?.[0]?.content?.parts?.[0];
          if (firstCandidate?.inlineData?.data) {
            const cdnUrl = await GommoService.uploadToCDN(firstCandidate.inlineData.data);
            finalData = GommoService.toVertexFormatUrl(cdnUrl);
            console.log(`✅ Imagen result hosted on CDN: ${cdnUrl}`);
          }
        } catch (uploadErr: any) {
          console.warn(`⚠️ CDN upload failed: ${uploadErr.message}. Falling back to Base64.`);
        }

        if (usage.usageLogId) await UsageService.finalizeUsage(usage.usageLogId, finalData);
        if (keyId) await KeyService.incrementUsage(keyId);
        res.json({ success: true, data: finalData });
        return;
      } catch (imagenErr: any) {
        console.error(`❌ Imagen REST failed: ${imagenErr.message?.slice(0, 300)}`);
        
        // Fallback to Gommo — use a CLEAN prompt, not raw finalPrompt
        // Raw finalPrompt has "ẢNH ĐẦU VÀO", "ẢNH THAM CHIẾU" labels
        // that confuse the model into generating exterior instead of interior
        console.log(`🔄 Attempting fallback to Gommo service...`);
        try {
          const cleanedGommoPrompt = finalPrompt
            .replace(/^(INPUT IMAGE|ẢNH ĐẦU VÀO)[^:]*:\s*/gim, '')
            .replace(/^(STYLE REFERENCE IMAGE|ẢNH THAM CHIẾU[^:]*)[^:]*:\s*/gim, '')
            .replace(/^(FILTER REFERENCE|BỘ LỌC[^:]*)[^:]*:\s*/gim, '')
            .trim();
          const isInteriorFallback = /interior|nội thất|phòng|không gian trong/i.test(cleanedGommoPrompt);
          const gommoPrompt = isInteriorFallback
            ? `Photorealistic interior design render: ${cleanedGommoPrompt}`
            : `Photorealistic exterior architectural render: ${cleanedGommoPrompt}`;

          const gommoResult = await GommoService.generateImage({
            prompt: gommoPrompt,
            aspect_ratio: aspectRatio === 'auto' ? '1:1' : aspectRatio,
            resolution: config?.imageConfig?.resolution || '2k',
            model: 'google_image_gen_banana_pro'
          });

          if (gommoResult.success && gommoResult.data) {
            if (usage.usageLogId) await UsageService.finalizeUsage(usage.usageLogId, gommoResult.data);
            res.json({ success: true, data: gommoResult.data });
            return;
          }
        } catch (fallbackErr: any) {
          console.error(`❌ Fallback failed: ${fallbackErr.message}`);
        }

        // All options exhausted — graceful error, no 500
        if (usage.usageLogId) await UsageService.failUsage(usage.usageLogId, imagenErr.message);
        res.status(503).json({ success: false, message: 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.' });
        return;
      }
    }

    // ─────────────────────────────────────────────────────────
    // PATH 4: PERSONAL AI (user's own key) — Direct SDK
    // ─────────────────────────────────────────────────────────
    if (isPersonalAI && ai) {
      console.log(`🚀 PATH 4: Personal AI → SDK direct`);
      const genConfig: any = {
        temperature: config?.temperature ?? 1,
        topP: config?.topP ?? 0.95,
        maxOutputTokens: config?.maxOutputTokens ?? 8192,
        candidateCount: imageCount,
        responseModalities: config?.responseModalities || ['TEXT', 'IMAGE'],
      };
      const result = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts }],
        config: genConfig,
      });
      res.json({ success: true, data: result });
      return;
    }

    // ─────────────────────────────────────────────────────────
    // PATH 5: GOMMO FALLBACK (text-to-image ONLY, no image input)
    // CRITICAL: Gommo does NOT support input images. If user uploaded
    // an image, we MUST NOT fall through here — return error instead.
    // ─────────────────────────────────────────────────────────
    if (hasImageParts) {
      // Cannot use Gommo for img2img — all SDK paths failed
      console.error(`❌ All SDK paths failed and Gommo cannot handle image input. Aborting.`);
      res.status(500).json({ 
        success: false, 
        message: 'Không thể tạo ảnh lúc này. Tất cả AI models đều thất bại. Vui lòng thử lại sau hoặc liên hệ admin.' 
      });
      return;
    }

    // Text-only prompt → Gommo is safe to use
    const gommoPrompt = `Photorealistic architectural rendering: ${finalPrompt}. Professional DSLR photo quality, HDR, sharp, architectural photography style.`;
    console.log(`🚀 PATH 5: Gommo Async fallback (prompt length=${gommoPrompt.length}, NO input image)`);
    const gommoResult = await GommoService.initiateImageGeneration({
      prompt: gommoPrompt,
      aspect_ratio: config?.imageConfig?.aspectRatio || '1:1',
      resolution: resolution,
      model: 'google_image_gen_banana_pro',
    });

    if (!gommoResult.success) throw new Error(gommoResult.error || 'Gommo generation failed');

    if (gommoResult.data) {
      if (usage.usageLogId) await UsageService.finalizeUsage(usage.usageLogId, gommoResult.data);
      if (keyId) await KeyService.incrementUsage(keyId);
      res.json({ success: true, data: gommoResult.data });
      return;
    }

    if (gommoResult.taskId) {
      res.json({ success: true, taskId: gommoResult.taskId, status: 'PENDING', usageLogId: usage.usageLogId, keyId });
      return;
    }

    throw new Error('Unexpected Gommo response state');
  } catch (error: any) {
    console.error('AI generate error:', error);

    if (usage.usageLogId) {
      await UsageService.failUsage(usage.usageLogId, error.message);
    }

    if (error.status === 429 || error.message?.includes('429')) {
      if (keyId) await KeyService.markKeyFailed(keyId);
    }

    res.status(error.status || 500).json({
      success: false,
      message: 'Lỗi khi gọi AI',
      error: error.message,
    });
  }
};

export const checkStatus = async (req: AuthRequest, res: Response) => {
  const { taskId } = req.params;
  const usageLogId = typeof req.query.usageLogId === 'string' ? req.query.usageLogId : undefined;
  const keyId = typeof req.query.keyId === 'string' ? req.query.keyId : undefined;

  try {
    const check = await GommoService.checkImageStatus(taskId as string);

    // Fetch usage log to check duration and ensure it's still pending
    let log = null;
    if (usageLogId) {
      const { default: UsageLog } = require('../models/UsageLog');
      log = await UsageLog.findByPk(usageLogId);
      
      if (log) {
        const durationMs = Date.now() - new Date(log.createdAt).getTime();
        const durationMins = durationMs / (1000 * 60);

        console.log(`🔍 Polling Job ${taskId}: status=${check.status}, duration=${durationMins.toFixed(1)}m`);

        // TIMEOUT DETECTION: If stuck in PENDING_PROCESSING for > 12 minutes
        if (check.status === 'PENDING_PROCESSING' && durationMins > 12) {
          console.error(`⚠️ Task ${taskId} timed out after ${durationMins.toFixed(1)} minutes. Failing usage.`);
          await UsageService.failUsage(usageLogId as string, 'AI Generation Timed Out (Zombie Task)');
          res.json({ 
            success: false, 
            status: 'TIMEOUT', 
            message: 'Đã quá thời gian chờ (12 phút). Vui lòng thử lại với prompt khác hoặc liên hệ admin.' 
          });
          return;
        }
      }
    }

    if (check.status === 'SUCCESS' && check.url) {
      // Job finished! Download and finalize
      console.log(`✅ Async Job ${taskId} SUCCESS. Downloading...`);
      const data = await GommoService.downloadAndFormat(check.url);

      if (usageLogId) {
        await UsageService.finalizeUsage(usageLogId as string, data);
      }
      if (keyId) {
        await KeyService.incrementUsage(Number(keyId));
      }

      res.json({ success: true, status: 'SUCCESS', data });
      return;
    }

    if (check.status === 'FAILED' || check.status === 'ERROR') {
      console.error(`❌ Async Job ${taskId} FAILED: ${check.error || 'Unknown error'}`);
      if (usageLogId) {
        await UsageService.failUsage(usageLogId as string, check.error || 'Gommo job failed');
      }
      res.json({ success: false, status: check.status, message: check.error || 'Job failed' });
      return;
    }

    // Still pending/processing
    res.json({ success: true, status: check.status });
  } catch (error: any) {
    console.error('Check status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

