import fetch from 'node-fetch';
import { GOMMO_CONFIG } from '../config/gommo';

export interface GommoGenerateParams {
  prompt: string;
  aspect_ratio?: string;
  resolution?: string;
  model?: string;
}

export interface GommoResponse {
  success: boolean;
  data?: any;
  taskId?: string;
  status?: string;
  message?: string;
  error?: string;
}

class GommoService {
  private tokens: string[] = [];
  private currentTokenIndex: number = 0;
  private domain: string = '';
  private initialized: boolean = false;

  private initialize() {
    if (this.initialized && this.tokens.length > 0) return;

    const tokenStr = process.env.GOMMO_ACCESS_TOKEN || '';
    const envTokens = tokenStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
    this.domain = process.env.GOMMO_DOMAIN || 'aivideoauto.com';

    if (envTokens.length > 0) {
      this.tokens = envTokens;
    } else {
      console.log(`ℹ️ GommoService: Fallback to GOMMO_CONFIG (${GOMMO_CONFIG.tokens?.length || 0} tokens)`);
      this.tokens = GOMMO_CONFIG.tokens || [];
      this.domain = GOMMO_CONFIG.domain || 'aivideoauto.com';
    }

    if (this.tokens.length > 0) {
      this.initialized = true;
      console.log(`✅ GommoService: ${this.tokens.length} tokens (${envTokens.length > 0 ? 'ENV' : 'FALLBACK'})`);
    } else {
      console.warn('⚠️ GommoService: No tokens available');
    }
  }

  private getNextToken(): string {
    this.initialize();
    if (this.tokens.length === 0) return '';
    const token = this.tokens[this.currentTokenIndex];
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
    return token;
  }

  private mapResolution(res: string): string {
    const map: Record<string, string> = { "1k": "1k", "2k": "2k", "3k": "2k", "4k": "4k", "5k": "4k" };
    return map[res.toLowerCase()] || "1k";
  }

  private mapRatio(ratio: string): string {
    return ratio.replace(':', '_');
  }

  /**
   * Status check via POST /ai/image (single call)
   */
  async checkImageStatus(taskId: string): Promise<{ status: string; url?: string; error?: string }> {
    const token = this.getNextToken();
    if (!token) throw new Error('Gommo Access Token is missing');

    try {
      const pollParams = new URLSearchParams();
      pollParams.append('access_token', token);
      pollParams.append('domain', this.domain);
      pollParams.append('id_base', taskId);

      const response = await fetch('https://api.gommo.net/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: pollParams.toString(),
      });

      const data = await response.json() as any;
      const info = data.imageInfo || data;
      
      return {
        status: info.status || 'UNKNOWN',
        url: info.result_url || info.url,
        error: info.error || info.message
      };
    } catch (error: any) {
      return { status: 'ERROR', error: error.message };
    }
  }

  /**
   * Upload base64 image to Gommo CDN
   */
  async uploadToCDN(base64: string): Promise<string> {
    const token = this.getNextToken();
    if (!token) throw new Error('Gommo Access Token is missing');

    try {
      // Remove data:image/jpeg;base64, prefix if present
      const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

      const params = new URLSearchParams();
      params.append('access_token', token);
      params.append('domain', this.domain);
      params.append('data', cleanBase64);

      const resp = await fetch('https://api.gommo.net/ai/image-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        timeout: 120000,
      });

      const data = await resp.json() as any;
      if (data.success && data.imageInfo?.url) {
        return data.imageInfo.url;
      }
      throw new Error(data.message || 'Gommo upload failed');
    } catch (err: any) {
      console.error(`❌ GommoService: Upload failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Download image from URL → base64
   * LEGACY: Keep for cases where base64 is explicitly needed
   */
  async downloadAndFormat(url: string): Promise<any> {
    // Append quality=100 to bypass Gommo CDN auto-compression
    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${sep}quality=100`;

    const response = await fetch(fullUrl, { timeout: 60000 });
    if (!response.ok) throw new Error(`Image download failed: ${response.status}`);

    const buffer = await response.buffer();
    const mimeType = response.headers.get('content-type') || 'image/png';
    const base64 = buffer.toString('base64');

    return this.toVertexFormat(base64, mimeType);
  }

  /**
   * Start generation job and return taskId
   */
  async initiateImageGeneration(params: GommoGenerateParams): Promise<GommoResponse> {
    const { prompt, aspect_ratio = "1:1", resolution = "1k", model = 'google_image_gen_banana_pro' } = params;

    const token = this.getNextToken();
    if (!token) throw new Error('Gommo Access Token is missing');

    const gommoRes = this.mapResolution(resolution);
    const gommoRatio = this.mapRatio(aspect_ratio);

    try {
      const createParams = new URLSearchParams();
      createParams.append('access_token', token);
      createParams.append('domain', this.domain);
      createParams.append('action_type', 'create');
      createParams.append('model', model || 'google_image_gen_banana_pro');
      createParams.append('prompt', prompt);
      createParams.append('ratio', gommoRatio);
      createParams.append('resolution', gommoRes);

      const createResp = await fetch("https://api.gommo.net/ai/generateImage", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: createParams.toString(),
        timeout: 60000,
      });

      const createData = await createResp.json() as any;

      if (createData.error && createData.error !== 0) {
        return { success: false, error: `Gommo Error ${createData.error}: ${createData.message}` };
      }

      const imageInfo = createData.imageInfo || createData;
      const idBase = imageInfo?.id_base;
      const status = imageInfo?.status;

      // If done immediately (sync models)
      if ((status === 'SUCCESS' || status === 'done') && (imageInfo.result_url || imageInfo.url)) {
        const url = imageInfo.result_url || imageInfo.url;
        // OPTIMIZATION: Return URL directly instead of downloading to base64
        return { success: true, data: this.toVertexFormatUrl(url), status: 'SUCCESS' };
      }

      if (!idBase) return { success: false, error: 'No taskId (id_base) returned' };

      return { success: true, taskId: idBase, status: 'PENDING' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Format as Vertex AI response (Base64)
   */
  private toVertexFormat(base64: string, mimeType: string): any {
    return {
      candidates: [{
        content: {
          role: 'model',
          parts: [{ inlineData: { mimeType, data: base64 } }]
        },
        finishReason: 'STOP',
      }]
    };
  }

  /**
   * Format as Vertex AI response (URL)
   */
  toVertexFormatUrl(url: string): any {
    return {
      candidates: [{
        content: {
          role: 'model',
          parts: [{ fileData: { mimeType: 'image/jpeg', fileUri: url } }]
        },
        finishReason: 'STOP',
      }],
      isUrl: true // Helper flag for frontend
    };
  }

  // Legacy support for sequential calls (internal or legacy routes)
  async generateImage(params: GommoGenerateParams): Promise<GommoResponse> {
    const init = await this.initiateImageGeneration(params);
    if (!init.success || init.data) return init;

    // Sequential poll if called via old generateImage
    let attempts = 0;
    while (attempts < 90) { // 3 min timeout
      await new Promise(r => setTimeout(r, 2000));
      const check = await this.checkImageStatus(init.taskId!);
      if (check.status === 'SUCCESS' && check.url) {
        // OPTIMIZATION: Return URL directly
        return { success: true, data: this.toVertexFormatUrl(check.url) };
      }
      if (check.status === 'FAILED' || check.status === 'ERROR') {
        return { success: false, error: check.error || 'Job failed' };
      }
      attempts++;
    }
    return { success: false, error: 'Timeout in legacy sequential call' };
  }
}

export default new GommoService();
