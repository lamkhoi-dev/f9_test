
import apiClient from '../lib/apiClient';

export interface AiConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseModalities?: string[];
  responseMimeType?: string;
  responseSchema?: any;
  imageConfig?: {
    imageSize?: '1K' | '2K' | '4K';
    aspectRatio?: string;
  };
  priceKey?: string;
  service?: string;
  page?: string;
  [key: string]: any;
}

export interface AiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface AiContent {
  role?: string;
  parts: AiPart[];
}

export interface AiResponse {
  candidates?: {
    content?: AiContent;
    finishReason?: string;
  }[];
  usageMetadata?: any;
  text?: string;
}

/**
 * Poll the backend for task status until resolved.
 * Progressive backoff: 2s -> 3s -> 5s max.
 */
async function pollTaskStatus(
  taskId: string, 
  usageLogId?: string, 
  keyId?: string
): Promise<AiResponse> {
  const startTime = Date.now();
  const MAX_POLL_TIME = 900000; // 15 minutes
  let interval = 2000;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    await new Promise(resolve => setTimeout(resolve, interval));
    
    // Increase interval slightly
    if (interval < 5000) interval += 500;

    try {
      const response = await apiClient.get(`/ai/status/${taskId}`, {
        params: { usageLogId, keyId }
      });

      const { success, status, data, message } = response.data;

      if (status === 'SUCCESS' && data) {
        return data as AiResponse;
      }

      if (success === false || status === 'FAILED' || status === 'ERROR') {
        throw new Error(message || 'AI Task failed');
      }

      // Keep polling if status is PENDING/PROCESSING
    } catch (error: any) {
      if (error.message?.includes('AI Task failed')) throw error;
      // Network error during polling -> retry silently
      console.warn('Polling hiccup:', error.message);
    }
  }

  throw new Error('AI Generation timed out');
}

/**
 * Send a generate request to the backend Vertex AI proxy.
 * This is the low-level function that posts to /ai/generate.
 */
async function callBackend(payload: {
  model?: string;
  contents?: AiContent | { parts: AiPart[] } | string;
  config?: AiConfig;
  prompt?: string;
  imageBase64?: string;
  mimeType?: string;
}): Promise<AiResponse> {
  // If contents is a string, convert to proper format
  const normalizedPayload = {
    ...payload,
    contents: typeof payload.contents === 'string' 
      ? { parts: [{ text: payload.contents }] } 
      : payload.contents,
    prompt: payload.prompt || (typeof payload.contents === 'string' ? payload.contents : undefined),
  };
  
  const response = await apiClient.post('/ai/generate', normalizedPayload);

  if (response.data.success) {
    // Check if it's an asynchronous task (Gommo flow)
    if (response.data.taskId) {
      console.log(`📡 AI Task initiated: ${response.data.taskId}. Polling...`);
      const result = await pollTaskStatus(
        response.data.taskId, 
        response.data.usageLogId, 
        response.data.keyId
      );
      return processResponse(result);
    }

    // Synchronous result (Vertex AI flow)
    return processResponse(response.data.data as AiResponse);
  } else {
    throw new Error(response.data.message || 'AI Generation failed');
  }
}

/**
 * Helper to extract text from response candidates
 */
function processResponse(data: AiResponse): AiResponse {
  if (data.candidates && data.candidates[0]?.content?.parts) {
    const textPart = data.candidates[0].content.parts.find(p => p.text);
    data.text = textPart?.text || '';
  }
  return data;
}

/**
 * Centralized AI service that proxies all frontend AI calls 
 * through the backend Vertex AI endpoint.
 */
const aiService = {
  /** Simple helper for prompt + optional image */
  generateContent: async (
    prompt: string,
    imageBase64?: string,
    mimeType?: string,
    model?: string,
    config?: AiConfig
  ): Promise<AiResponse> => {
    try {
      return await callBackend({ prompt, imageBase64, mimeType, model, config });
    } catch (error: any) {
      console.error('aiService.generateContent error:', error);
      throw error;
    }
  },

  /**
   * Dedicated lightweight analysis endpoint.
   * Calls /api/ai/analyze directly — synchronous, no queue, fast.
   * Use for: reference image analysis, style extraction, filter detection.
   */
  analyzeContent: async (params: {
    parts: AiPart[];
    responseMimeType?: string;
    responseSchema?: any;
  }): Promise<AiResponse> => {
    try {
      const response = await apiClient.post('/ai/analyze', {
        parts: params.parts,
        responseMimeType: params.responseMimeType,
        responseSchema: params.responseSchema,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Analysis failed');
      }

      const result: AiResponse = response.data.data || {};
      result.text = response.data.text || result.text || '';
      return result;
    } catch (error: any) {
      console.error('aiService.analyzeContent error:', error);
      throw error;
    }
  },

  /**
   * Dedicated Gemini image description.
   * POST /api/gemini/describe-image
   */
  describeImage: async (imageBase64: string, mimeType: string, prompt?: string): Promise<AiResponse> => {
    try {
      const response = await apiClient.post('/gemini/describe-image', {
        imageBase64,
        mimeType,
        prompt
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Description failed');
      }

      const result: AiResponse = response.data.data || {};
      result.text = response.data.text || result.text || '';
      return result;
    } catch (error: any) {
      console.error('aiService.describeImage error:', error);
      throw error;
    }
  },


  /** 
   * SDK-compatible interface: drop-in replacement for ai.models.generateContent().
   */
  models: {
    generateContent: async (params: {
      model: string;
      contents: AiContent | { parts: AiPart[] } | string;
      config?: AiConfig;
    }): Promise<AiResponse> => {
      try {
        const response = await callBackend({
          model: params.model,
          contents: params.contents,
          config: params.config,
        });
        
        // Notify listeners on success
        aiService.onSuccess?.();
        
        return response;
      } catch (error: any) {
        console.error('aiService.models.generateContent error:', error);
        throw error;
      }
    }
  },
  
  /** Callback for when an AI call succeeds (used to refresh balance) */
  onSuccess: null as (() => void) | null
};

export default aiService;
