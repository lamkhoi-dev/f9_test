import { GoogleGenAI } from '@google/genai';
import VertexKey from '../models/VertexKey';

// In-memory blacklist: keyId → timestamp when blacklisted
// Keys here are skipped instantly by ALL concurrent requests
const blacklist = new Map<number, number>();
const BLACKLIST_TTL_MS = 45 * 1000; // 45 seconds

function isBlacklisted(keyId: number): boolean {
  const ts = blacklist.get(keyId);
  if (!ts) return false;
  if (Date.now() - ts > BLACKLIST_TTL_MS) {
    blacklist.delete(keyId);
    console.log(`✅ Key ID ${keyId} removed from blacklist after 45s`);
    return false;
  }
  return true;
}

function addToBlacklist(keyId: number): void {
  blacklist.set(keyId, Date.now());
  console.log(`🚫 Key ID ${keyId} blacklisted for 45s`);

  // Auto-remove and sync DB status back to 'active' after 45s
  setTimeout(async () => {
    blacklist.delete(keyId);
    console.log(`✅ Key ID ${keyId} auto-removed from blacklist`);
    try {
      await VertexKey.update({ status: 'active' }, { where: { id: keyId, status: 'limited' } });
    } catch (e) {}
  }, BLACKLIST_TTL_MS);
}

class KeyService {
  /**
   * Get an active Vertex AI instance.
   * - Skips blacklisted keys instantly (in-memory, no DB round trip).
   * - Falls back to env credentials if no keys in DB.
   * - Load-balances by lowest dailyUsed.
   */
  static async getVertexAI(): Promise<{ ai: any; keyId: number; projectId: string } | null> {
    const keys = await VertexKey.findAll({
      where: { status: 'active' },
      order: [['dailyUsed', 'ASC']],
    });

    const available = keys.filter(k => !isBlacklisted(k.id) && k.id !== 9);

    if (available.length === 0) {
      // No active DB keys — do NOT fallback to ENV
      console.warn('⚠️ No active API keys in database. Admin must add keys via Admin Panel.');
      return null;
    }

    const key = available[0];
    const resolvedProjectId = key.projectId || (key.keyType === 'service_account' && key.credentials?.project_id) || process.env.GOOGLE_CLOUD_PROJECT || 'unknown-project';
    const initConfig: any = {
      vertexai: true,
      project: resolvedProjectId,
      location: (key as any).location || 'us-central1',  // per-key location, default us-central1
      httpOptions: { timeout: 20 * 60 * 1000 },
    };

    if (key.keyType === 'service_account') {
      initConfig.googleAuthOptions = { credentials: key.credentials };
    } else {
      initConfig.apiKey = key.credentials;
    }

    return { ai: new GoogleGenAI(initConfig), keyId: key.id, projectId: resolvedProjectId };
  }

  /**
   * Get AI instance with a specific location override (e.g., 'global' for Gemini 3 models).
   */
  static async getVertexAIWithLocation(location: string): Promise<{ ai: any; keyId: number; projectId: string } | null> {
    const keys = await VertexKey.findAll({
      where: { status: 'active' },
      order: [['dailyUsed', 'ASC']],
    });

    const available = keys.filter(k => !isBlacklisted(k.id) && k.id !== 9);
    if (available.length === 0) return null;

    const key = available[0];
    const resolvedProjectId = key.projectId || (key.keyType === 'service_account' && key.credentials?.project_id) || process.env.GOOGLE_CLOUD_PROJECT || 'unknown-project';
    const initConfig: any = {
      vertexai: true,
      project: resolvedProjectId,
      location,
      httpOptions: { timeout: 20 * 60 * 1000 },
    };

    if (key.keyType === 'service_account') {
      initConfig.googleAuthOptions = { credentials: key.credentials };
    } else {
      initConfig.apiKey = key.credentials;
    }

    return { ai: new GoogleGenAI(initConfig), keyId: key.id, projectId: resolvedProjectId };
  }

  static validateServiceAccount(credentials: any): void {
    if (!credentials) {
      throw new Error('Cấu hình credentials không được trống');
    }
    if (typeof credentials === 'object') {
      const { client_email, private_key, project_id } = credentials;
      const missing = [];
      if (!client_email) missing.push('client_email');
      if (!private_key) missing.push('private_key');
      if (!project_id) missing.push('project_id');
      
      if (missing.length > 0) {
        throw new Error(`Service Account JSON thiếu thông tin bắt buộc: ${missing.join(', ')}`);
      }
    } else if (typeof credentials === 'string') {
      if (!credentials.trim()) {
        throw new Error('API Key hoặc Service Account không được để trống');
      }
    }
  }

  static parseUserCredentialsHeader(header: string): any {
    if (!header) return null;
    let decoded = header;
    // If it doesn't look like raw JSON, attempt base64 decode
    if (!header.startsWith('{')) {
      try {
        decoded = Buffer.from(header, 'base64').toString('utf-8');
      } catch (e) {
        decoded = header;
      }
    }
    // Attempt JSON parse
    try {
      return JSON.parse(decoded);
    } catch (e) {
      return decoded; // Fallback to string API key
    }
  }

  /**
   * Get AI instance with custom user credentials (bypasses system rotation).
   */
  static getCustomVertexAI(credentials: any, projectId?: string): any {
    this.validateServiceAccount(credentials);

    const initConfig: any = {
      httpOptions: { timeout: 20 * 60 * 1000 },
    };

    if (typeof credentials === 'object' && credentials !== null) {
      initConfig.vertexai = true;
      initConfig.project = credentials.project_id || projectId || process.env.GOOGLE_CLOUD_PROJECT;
      initConfig.location = 'us-central1';
      initConfig.googleAuthOptions = { credentials };
    } else {
      initConfig.apiKey = credentials;
    }

    return new GoogleGenAI(initConfig);
  }

  /**
   * Immediately blacklist a key in-memory (for concurrent request protection).
   * Also marks it as 'limited' in DB for observability.
   */
  static async markKeyFailed(keyId: number): Promise<void> {
    if (keyId === 0) return; // Env fallback key — can't blacklist

    // Step 1: In-memory blacklist IMMEDIATELY (sync, zero latency)
    addToBlacklist(keyId);

    // Step 2: Persist to DB async (for Admin UI visibility)
    VertexKey.update({ status: 'limited' }, { where: { id: keyId } }).catch(() => {});
  }

  /**
   * Increment daily usage count for a key.
   */
  static async incrementUsage(keyId: number): Promise<void> {
    if (keyId === 0) return;
    VertexKey.update(
      { dailyUsed: (VertexKey as any).sequelize.literal('daily_used + 1'), lastUsedAt: new Date() },
      { where: { id: keyId } }
    ).catch(() => {});
  }

  /**
   * Expose blacklist status for admin/debug purposes.
   */
  static getBlacklistStatus(): { keyId: number; expiresInMs: number }[] {
    const now = Date.now();
    return Array.from(blacklist.entries()).map(([keyId, ts]) => ({
      keyId,
      expiresInMs: Math.max(0, BLACKLIST_TTL_MS - (now - ts)),
    }));
  }
  /**
   * Get raw credentials and project info for the Direct Bridge flow.
   */
  static async getVertexAIConfig(): Promise<{ credentials: any; projectId: string; location: string; keyId: number } | null> {
    const keys = await VertexKey.findAll({
      where: { status: 'active' },
      order: [['dailyUsed', 'ASC']],
    });

    const available = keys.filter(k => !isBlacklisted(k.id) && k.id !== 9);

    if (available.length === 0) {
      // No active DB keys — do NOT fallback to ENV
      console.warn('⚠️ No active API keys in database for REST config.');
      return null;
    }

    const key = available[0];
    const resolvedProjectId = key.projectId || (key.keyType === 'service_account' && key.credentials?.project_id) || process.env.GOOGLE_CLOUD_PROJECT || '';
    return { 
      credentials: key.credentials, 
      projectId: resolvedProjectId, 
      location: (key as any).location || 'us-central1',
      keyId: key.id 
    };
  }
}

export default KeyService;
