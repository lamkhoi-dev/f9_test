/**
 * API client for communicating with the backend proxy server.
 * Replaces direct GoogleGenAI SDK calls from the browser.
 */

const STORAGE_KEY = 'f9_user_api_key';

function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getStoredApiKey();
  if (key) {
    headers['x-api-key'] = key;
  }
  return headers;
}

interface GenerateContentParams {
  model: string;
  contents: any;
  config?: any;
}

interface GenerateContentResponse {
  text: string | null;
  candidates: Array<{
    content: {
      parts: Array<any>;
      role?: string;
    };
    finishReason?: string;
  }>;
}
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = {
  /**
   * Proxy for ai.models.generateContent()
   * Handles both text and image generation.
   * Automatically attaches user API key from localStorage.
   */
  generateContent: async (params: GenerateContentParams): Promise<GenerateContentResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/generate-content`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      const error = new Error(errorData.error || `API Error: ${res.status}`);
      (error as any).status = res.status;
      (error as any).details = errorData.details;
      throw error;
    }

    return res.json();
  },
};

/**
 * Validate an API key against the backend.
 */
export const validateApiKey = async (key: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Helper: Build imageConfig wrapper.
 * Returns { imageConfig: { imageSize: '...' } }
 */
export const getImageSizeConfig = (isPro: boolean, proResolution: string) => {
  if (!isPro) return {};
  const sizeMap: Record<string, string> = { '1k': '1K', '2k': '2K', '4k': '4K' };
  return { imageConfig: { imageSize: sizeMap[proResolution] || '1K' } };
};

/**
 * Helper: Build internal imageSize object.
 * Returns { imageSize: '...' } for spreading inside an existing imageConfig object.
 */
export const getImageSize = (isPro: boolean, proResolution: string) => {
  if (!isPro) return {};
  const sizeMap: Record<string, string> = { '1k': '1K', '2k': '2K', '4k': '4K' };
  return { imageSize: sizeMap[proResolution] || '1K' };
};
