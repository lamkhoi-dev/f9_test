import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
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
  static async getVertexAI(): Promise<{ ai: any; keyId: number } | null> {
    const keys = await VertexKey.findAll({
      where: { status: 'active' },
      order: [['dailyUsed', 'ASC']],
    });

    const available = keys.filter(k => !isBlacklisted(k.id) && k.id !== 9);

    if (available.length === 0) {

      // All DB keys are blacklisted or none exist → fallback to env
      const project = process.env.GOOGLE_CLOUD_PROJECT;
      if (!project) return null;

      const initConfig: any = {
        vertexai: true,
        project,
        location: 'us-central1',
        httpOptions: { timeout: 20 * 60 * 1000 },
      };

      const b64Creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (b64Creds) {
        try {
          const decoded = Buffer.from(b64Creds, 'base64').toString('utf-8');
          initConfig.googleAuthOptions = { credentials: JSON.parse(decoded) };
        } catch (e) {}
      } else if (credsPath) {
        try {
          const absolutePath = path.isAbsolute(credsPath) ? credsPath : path.join(process.cwd(), credsPath);
          if (fs.existsSync(absolutePath)) {
            const raw = fs.readFileSync(absolutePath, 'utf8');
            initConfig.googleAuthOptions = { credentials: JSON.parse(raw) };
            console.log(`🔑 Using Admin Key from file: ${credsPath}`);
          }
        } catch (e: any) {
          console.warn(`⚠️ Failed to read admin key file: ${e.message}`);
        }
      }

      return { ai: new GoogleGenAI(initConfig), keyId: 0 };
    }

    const key = available[0];
    const initConfig: any = {
      vertexai: true,
      project: key.projectId || process.env.GOOGLE_CLOUD_PROJECT,
      location: (key as any).location || 'us-central1',  // per-key location, default us-central1
      httpOptions: { timeout: 20 * 60 * 1000 },
    };

    if (key.keyType === 'service_account') {
      initConfig.googleAuthOptions = { credentials: key.credentials };
    } else {
      initConfig.apiKey = key.credentials;
    }

    return { ai: new GoogleGenAI(initConfig), keyId: key.id };
  }

  /**
   * Get AI instance with custom user credentials (bypasses system rotation).
   */
  static getCustomVertexAI(credentials: any, projectId?: string): any {
    const initConfig: any = {
      vertexai: true,
      project: credentials?.project_id || projectId || process.env.GOOGLE_CLOUD_PROJECT,
      location: 'us-central1',
      httpOptions: { timeout: 20 * 60 * 1000 },
    };

    if (typeof credentials === 'object' && credentials !== null) {
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
      const project = process.env.GOOGLE_CLOUD_PROJECT;
      if (!project) return null;

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
          const absolutePath = path.isAbsolute(credsPath) ? credsPath : path.join(process.cwd(), credsPath);
          if (fs.existsSync(absolutePath)) {
            credentials = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
          }
        } catch (e) {}
      }

      return { credentials, projectId: project, location: 'us-central1', keyId: 0 };
    }

    const key = available[0];
    return { 
      credentials: key.credentials, 
      projectId: key.projectId || process.env.GOOGLE_CLOUD_PROJECT || '', 
      location: (key as any).location || 'us-central1',
      keyId: key.id 
    };
  }
}

export default KeyService;
