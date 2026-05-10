import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';
import KeyService from './KeyService';

export interface VertexGenerateParams {
  prompt: string;
  aspectRatio?: string;
  model?: string;
  resolution?: string;
  imageBase64?: string;     // Input image as base64 (for img2img)
  imageMimeType?: string;   // e.g. 'image/jpeg'
  numberOfImages?: number;
  imageFidelity?: number;   // 0.0 to 1.0 (default 0.9 for high consistency)
  negativePrompt?: string;  // things to avoid (e.g. "cartoon, 3d render")
  styleImageBase64?: string; // Optional style reference image (for dual-ref)
  styleImageMimeType?: string; // e.g. 'image/jpeg'
  useControlMode?: boolean; // Use REFERENCE_TYPE_CONTROL instead of RAW for structural lock
  controlType?: 'CONTROL_TYPE_CANNY' | 'CONTROL_TYPE_SCRIBBLE'; // Edge detection type
}

class VertexDirectService {
  /**
   * Get auth instance with fresh credentials
   */
  private getAuth(credentials: any) {
    return new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  /**
   * Get service account credentials from environment variables.
   * Used as fallback when DB keys are API key type (can't generate Bearer tokens).
   */
  private async getEnvServiceAccountConfig(): Promise<{ credentials: any; projectId: string; location: string; keyId: number } | null> {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) return null;

    let credentials = null;
    const b64Creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (b64Creds) {
      try {
        const decoded = Buffer.from(b64Creds, 'base64').toString('utf-8');
        credentials = JSON.parse(decoded);
      } catch (e) {}
    } else if (credsPath) {
      try {
        const fs = require('fs');
        const path = require('path');
        const absolutePath = path.isAbsolute(credsPath) ? credsPath : path.join(process.cwd(), credsPath);
        if (fs.existsSync(absolutePath)) {
          credentials = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
        }
      } catch (e) {}
    }

    if (!credentials || typeof credentials !== 'object') return null;
    console.log(`🔑 Using env service account for REST API (project=${projectId})`);
    return { credentials, projectId, location: 'us-central1', keyId: 0 };
  }

  /**
   * Get a valid access token from service account credentials
   */
  private async getAccessToken(credentials: any): Promise<string> {
    const auth = this.getAuth(credentials);
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) throw new Error('Failed to generate Google Access Token');
    return tokenResponse.token;
  }

  /**
   * IMAGE GENERATION via Imagen 3 predict API (REST)
   * Supports both text-to-image and image-to-image (with reference)
   * 
   * POST https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}:predict
   */
  async generateImage(params: VertexGenerateParams, customConfig?: { credentials: any; projectId: string; location: string; keyId?: number }): Promise<any> {
    let config = customConfig || await KeyService.getVertexAIConfig();
    
    // REST API needs service account credentials (object) for Bearer token.
    // If credentials is a string (API key), it can't generate Bearer tokens.
    // Fall back to env var service account credentials.
    if (config && typeof config.credentials === 'string') {
      console.log(`⚠️ DB key is API key type — falling back to env service account for REST API`);
      config = await this.getEnvServiceAccountConfig();
    }
    
    if (!config?.credentials || typeof config.credentials !== 'object') {
      throw new Error('No service account credentials found for Imagen REST API');
    }

    const { 
      prompt, 
      aspectRatio = '1:1', 
      model = 'imagen-3.0-generate-001',
      imageBase64,
      numberOfImages = 1
    } = params;
    const { credentials, projectId, location } = config;

    // 1. Get access token
    const token = await this.getAccessToken(credentials);

    // 2. Construct Vertex AI REST URL (direct, no proxy)
    const baseUrl = `https://${location}-aiplatform.googleapis.com`;
    const path = `v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;
    const fullUrl = `${baseUrl}/${path}`;

    // 3. Build instance — imagen-3.0-generate-001 is TEXT-TO-IMAGE only.
    // Input images are analyzed into filter fields by the frontend,
    // so the prompt already contains all architectural details.
    const instance: any = { prompt };
    if (imageBase64) {
      console.log(`📎 Input image provided but skipped — imagen-3.0-generate-001 is text-to-image only. Prompt carries the details.`);
    }

    // 4. Build payload
    const payload = {
      instances: [instance],
      parameters: {
        sampleCount: Math.min(numberOfImages, 4),
        aspectRatio: ['1:1', '16:9', '9:16', '4:3', '3:4'].includes(aspectRatio) ? aspectRatio : '1:1',
        negativePrompt: params.negativePrompt || '',
        includeSafetyAttributes: false,
        personGeneration: 'allow_adult',
      }
    };

    console.log(`📡 Imagen REST API: ${fullUrl}`);
    console.log(`📎 Prompt: "${prompt.slice(0, 100)}..."`);
    console.log(`📎 Instance: ${JSON.stringify(instance)}`);

    // 5. Execute
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 120000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Imagen REST Error (${response.status}): ${errorText.slice(0, 300)}`);
      throw new Error(`Imagen REST failed: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    const result = await response.json() as any;

    // 6. Transform predictions → standard candidates format
    const predictions = result.predictions || [];
    if (predictions.length === 0) throw new Error('Imagen returned no predictions');

    const candidates = predictions
      .filter((p: any) => p.bytesBase64Encoded)
      .map((p: any) => ({
        content: {
          role: 'model',
          parts: [{ inlineData: { mimeType: p.mimeType || 'image/png', data: p.bytesBase64Encoded } }],
        },
        finishReason: 'STOP',
      }));

    if (candidates.length === 0) throw new Error('Imagen returned no image data in predictions');

    // Increment usage
    if (config.keyId) {
      await KeyService.incrementUsage(config.keyId);
    }

    console.log(`✅ Imagen REST SUCCESS (${candidates.length} images)`);
    return { candidates };
  }

  /**
   * IMAGE EDITING via Imagen 3 Capability API
   * Uses imagen-3.0-capability-001 which accepts an input image + prompt.
   * This is the correct model for sketch → photorealistic render.
   * 
   * POST .../models/imagen-3.0-capability-001:predict
   */
  async editImage(params: VertexGenerateParams, customConfig?: { credentials: any; projectId: string; location: string; keyId?: number }): Promise<any> {
    // Try DB keys first (they have their own service account + project)
    // Fall back to env credentials if DB key is API key type
    let config = customConfig || await KeyService.getVertexAIConfig();
    
    if (config && typeof config.credentials === 'string') {
      console.log(`⚠️ DB key id=${config.keyId} is API key type — falling back to env service account`);
      config = await this.getEnvServiceAccountConfig();
    }
    
    if (!config?.credentials || typeof config.credentials !== 'object') {
      throw new Error('No service account credentials found for Imagen Capability REST API');
    }
    console.log(`🔑 editImage using project=${config.projectId}, keyId=${config.keyId}, credType=${typeof config.credentials}`);

    const { 
      prompt, 
      aspectRatio = '1:1', 
      imageBase64,
      imageMimeType = 'image/jpeg',
      numberOfImages = 1,
      styleImageBase64,
      styleImageMimeType = 'image/jpeg'
    } = params;
    const { credentials, projectId, location } = config;

    if (!imageBase64) throw new Error('editImage requires imageBase64 input');

    const token = await this.getAccessToken(credentials);
    const baseUrl = `https://${location}-aiplatform.googleapis.com`;
    const path = `v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-capability-001:predict`;
    const fullUrl = `${baseUrl}/${path}`;

    // ── Reference Image Strategy ──
    // CONTROL mode (default): Uses REFERENCE_TYPE_CONTROL with edge detection
    //   → Forces model to follow exact geometry from input sketch
    //   → enableControlImageComputation: true = Imagen auto-extracts edges
    // RAW mode (fallback): Uses REFERENCE_TYPE_RAW for general reference
    //   → Model treats input as loose inspiration, may alter structure
    const useControl = params.useControlMode !== false; // Default to CONTROL mode
    const ctrlType = params.controlType || 'CONTROL_TYPE_CANNY';

    const referenceImages: any[] = [];

    if (useControl) {
      // CONTROL mode: Match Google's exact docs format
      // NOTE: CONTROL + STYLE in same request causes 400 INVALID_ARGUMENT
      // Style must come from prompt text when using CONTROL mode
      referenceImages.push({
        referenceType: 'REFERENCE_TYPE_CONTROL',
        referenceId: 1,
        referenceImage: { bytesBase64Encoded: imageBase64 },
        controlImageConfig: {
          controlType: ctrlType,
          enableControlImageComputation: true,
        },
      });
      if (styleImageBase64) {
        console.log(`⚠️ CONTROL mode: Style image ignored (incompatible with CONTROL). Style info must be in prompt text.`);
      }
      console.log(`🔒 CONTROL mode: ${ctrlType} + auto edge computation`);
    } else {
      // Legacy RAW mode (fallback)
      referenceImages.push({
        referenceType: 'REFERENCE_TYPE_RAW',
        referenceId: 1,
        referenceImage: { bytesBase64Encoded: imageBase64, mimeType: imageMimeType },
      });
      console.log(`📎 RAW mode: legacy reference (no structural lock)`);

      // STYLE reference only works with RAW mode
      if (styleImageBase64) {
        referenceImages.push({
          referenceType: 'REFERENCE_TYPE_STYLE',
          referenceId: 2,
          referenceImage: { bytesBase64Encoded: styleImageBase64 },
        });
        console.log(`🎨 STYLE reference attached as [2]`);
      }
    }

    const instance: any = {
      prompt,
      referenceImages,
    };

    // Parameters differ between CONTROL and RAW modes
    let parameters: any;
    if (useControl) {
      // CONTROL mode: minimal params + quality controls
      // Note: 400 was caused by STYLE ref, not params — safe to add quality params
      parameters = {
        sampleCount: Math.min(numberOfImages, 4),
        negativePrompt: params.negativePrompt || '',
        personGeneration: 'allow_adult',
      };
    } else {
      // RAW mode: full parameter set
      parameters = {
        sampleCount: Math.min(numberOfImages, 4),
        aspectRatio: ['1:1', '16:9', '9:16', '4:3', '3:4'].includes(aspectRatio) ? aspectRatio : '1:1',
        editMode: 'EDIT_MODE_DEFAULT',
        imageFidelity: params.imageFidelity ?? 1.0,
        negativePrompt: params.negativePrompt || '',
        includeSafetyAttributes: false,
        personGeneration: 'allow_adult',
      };
    }

    const payload = {
      instances: [instance],
      parameters,
    };

    console.log(`📡 Imagen Capability API (img2img): ${fullUrl}`);
    console.log(`📎 Prompt: "${prompt.slice(0, 100)}..."`);
    // Debug: log payload structure (without image data)
    const debugRefs = referenceImages.map((r: any) => ({
      referenceType: r.referenceType,
      referenceId: r.referenceId,
      controlImageConfig: r.controlImageConfig,
      hasImage: !!r.referenceImage?.bytesBase64Encoded,
    }));
    console.log(`📋 Payload structure: refs=${JSON.stringify(debugRefs)}, params=${JSON.stringify(parameters)}`);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 120000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Imagen Capability Error (${response.status}): ${errorText.slice(0, 800)}`);
      throw new Error(`Imagen Capability failed: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    const result = await response.json() as any;
    const predictions = result.predictions || [];
    if (predictions.length === 0) throw new Error('Imagen Capability returned no predictions');

    const candidates = predictions
      .filter((p: any) => p.bytesBase64Encoded)
      .map((p: any) => ({
        content: {
          role: 'model',
          parts: [{ inlineData: { mimeType: p.mimeType || 'image/png', data: p.bytesBase64Encoded } }],
        },
        finishReason: 'STOP',
      }));

    if (candidates.length === 0) throw new Error('Imagen Capability returned no image data');

    if (config.keyId) await KeyService.incrementUsage(config.keyId);
    console.log(`✅ Imagen Capability SUCCESS (${candidates.length} images)`);
    return { candidates };
  }

  /**
   * Legacy sync method (kept for backward compat)
   */
  async generateSync(params: VertexGenerateParams, customConfig?: any): Promise<any> {
    return this.generateImage(params, customConfig);
  }
}

export default new VertexDirectService();
