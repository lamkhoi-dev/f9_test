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

export const hasPersonalKeyConfigured = (): boolean => {
  try {
    const saved = localStorage.getItem('f9_user_api_config');
    if (saved) {
      const config = JSON.parse(saved);
      return config.usePersonalKey && config.credentials && config.credentials.trim() !== '';
    }
  } catch (e) {
    return false;
  }
  return false;
};

export const apiClient = {
  /**
   * Proxy for ai.models.generateContent()
   * Default: uses system server-side credentials.
   * Personal mode: when user has toggled ON "usePersonalKey" in AISettingsModal,
   * sends their GCP Service Account credentials via x-user-credentials header.
   */
  generateContent: async (params: GenerateContentParams): Promise<GenerateContentResponse> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Personal key injection — only when explicitly toggled ON by user
    try {
      const saved = localStorage.getItem('f9_user_api_config');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.usePersonalKey && config.credentials && config.credentials.trim()) {
          headers['x-user-credentials'] = btoa(config.credentials);
        }
      }
    } catch (e) {
      // Ignore — fallback to system credentials
    }

    const res = await fetch(`${API_BASE_URL}/api/generate-content`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));

      // Special case: model not enabled in GCP — show setup modal via global event
      if (errorData.code === 'MODEL_NOT_ENABLED') {
        const err = new Error(errorData.error || 'Model chưa được kích hoạt');
        (err as any).code = 'MODEL_NOT_ENABLED';
        (err as any).setupUrl = errorData.setupUrl;
        (err as any).instructions = errorData.instructions;
        (err as any).status = 403;

        // Dispatch global event to show ModelNotEnabledModal from any page
        window.dispatchEvent(new CustomEvent('model_not_enabled', {
          detail: {
            modelName: errorData.model || 'unknown',
            setupUrl: errorData.setupUrl,
            instructions: errorData.instructions || [],
            links: errorData.links || {},
          }
        }));

        throw err;
      }

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

    const data = await res.json();

    // Process response data if it contains candidates with fileData
    if (data && data.candidates && Array.isArray(data.candidates)) {
      for (const candidate of data.candidates) {
        const parts = candidate.content?.parts;
        if (!parts || !Array.isArray(parts)) continue;

        for (const part of parts) {
          if (part.fileData && part.fileData.fileUri) {
            try {
              const fileUri = part.fileData.fileUri;
              const absoluteUrl = fileUri.startsWith('http') 
                ? fileUri 
                : `${API_BASE_URL.replace(/\/$/, '')}/${fileUri.replace(/^\//, '')}`;

              console.log(`🔗 Resolving fileUri in api.ts: ${absoluteUrl}`);
              const imageRes = await fetch(absoluteUrl);
              if (imageRes.ok) {
                const blob = await imageRes.blob();
                const reader = new FileReader();
                const base64Data = await new Promise<string>((resolve, reject) => {
                  reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });

                const mimeType = part.fileData.mimeType || blob.type || 'image/png';
                delete part.fileData;
                part.inlineData = {
                  mimeType,
                  data: base64Data
                };
                console.log(`✅ Successfully resolved fileUri to base64 client-side`);
              }
            } catch (err) {
              console.error('⚠️ Failed to resolve image URL to base64 in api.ts:', err);
            }
          }
        }
      }
    }

    return data;
  },

  /**
   * Deduct credit instantly for AI suggestions
   */
  deductInstantCredit: async (amount: number, reason: string): Promise<boolean> => {
    if (hasPersonalKeyConfigured()) {
      return true; // Skip deduction if using personal key
    }

    const token = localStorage.getItem('f9_token');
    if (!token) throw new Error('Unauthorized');

    const res = await fetch(`${API_BASE_URL}/api/purchase/deduct-instant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount, reason }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to deduct credits');
    }

    return true;
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
