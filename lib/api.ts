/**
 * API client for communicating with the backend proxy server.
 * Backend uses Vertex AI with Service Account — no user API key needed.
 */

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
   * Handles both text and image generation via Vertex AI backend.
   */
  generateContent: async (params: GenerateContentParams): Promise<GenerateContentResponse> => {
    let userCredentials = undefined;
    try {
      const aiConfigStr = localStorage.getItem('f9_user_api_config');
      if (aiConfigStr) {
        const aiConfig = JSON.parse(aiConfigStr);
        if (aiConfig.usePersonalKey && aiConfig.credentials) {
          try {
            userCredentials = JSON.parse(aiConfig.credentials);
          } catch (e) {
            userCredentials = aiConfig.credentials;
          }
        }
      }

      if (!userCredentials) {
        const stored = localStorage.getItem('f9_gcp_credentials');
        if (stored) {
          userCredentials = JSON.parse(stored);
        }
      }
    } catch (e) {
      // Ignore parsing errors, it will just fallback to system credentials
    }

    const res = await fetch(`${API_BASE_URL}/api/generate-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, userCredentials }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      let errorMessage = errorData.error || `API Error: ${res.status}`;
      
      try {
        if (typeof errorMessage === 'string') {
          const jsonMatch = errorMessage.match(/(\{.*\})/s);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.error && parsed.error.message) {
              errorMessage = parsed.error.message;
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }

      const error = new Error(errorMessage);
      (error as any).status = res.status;
      (error as any).details = errorData.details;
      throw error;
    }

    return res.json();
  },
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
