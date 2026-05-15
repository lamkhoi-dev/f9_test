import User from '../models/User';
import Pricing from '../models/Pricing';
import UsageLog from '../models/UsageLog';
import AppConfig from '../models/AppConfig';
import sequelize from '../config/database';
import { Transaction } from 'sequelize';

export interface UsageCheckResult {
  canProceed: boolean;
  type: 'free' | 'paid' | 'hybrid';
  cost: number;
  freeUsed: number;
  paidCount: number;
  message?: string;
  usageLogId?: string;
}

class UsageService {
  /**
   * Atomic billing: SELECT FOR UPDATE → validate → pre-deduct → log.
   * Prevents race conditions where concurrent requests could overdraft.
   * On AI failure, failUsage() refunds the pre-deducted amounts.
   */
  static async checkAndPrepareUsage(
    userId: string, 
    model: string, 
    resolution?: string,
    priceKey?: string,
    service?: string,
    page?: string,
    config?: any,
    inputData?: string,
    imageCount: number = 1
  ): Promise<UsageCheckResult> {
    const normalizedResolution = (resolution || '1k').toLowerCase();

    return await sequelize.transaction(async (t: Transaction) => {
      // Row-level lock: blocks other transactions for this user until commit
      const user = await User.findByPk(userId, { 
        lock: Transaction.LOCK.UPDATE, 
        transaction: t 
      });

      if (!user) {
        return { canProceed: false, type: 'free' as const, cost: 0, freeUsed: 0, paidCount: 0, message: 'Người dùng không tồn tại' };
      }

      // Daily free usage reset (runs atomically inside the lock)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const lastReset = user.lastFreeReset ? new Date(user.lastFreeReset).toISOString().split('T')[0] : null;
      
      if (lastReset !== today) {
        // Determine daily limit: per-user override or global default
        let dailyLimit = user.dailyFreeLimit;
        if (dailyLimit === 0) {
          // Fetch global default from AppConfig
          const globalConfig = await AppConfig.findOne({ where: { key: 'defaultDailyFreeLimit' }, transaction: t });
          dailyLimit = globalConfig ? parseInt(globalConfig.value, 10) || 0 : 0;
        }
        user.freeUsageLeft = dailyLimit;
        user.lastFreeReset = new Date();
        await user.save({ transaction: t });
      }

      // Admin bypass — no billing
      if (user.role === 'admin') {
        const log = await UsageLog.create({
          userId, model, resolution: normalizedResolution,
          cost: 0, type: 'free', status: 'pending',
          page, config, inputData, imageCount, freeUsed: 0
        }, { transaction: t });
        return { canProceed: true, type: 'free' as const, cost: 0, freeUsed: 0, paidCount: 0, usageLogId: log.id };
      }

      // Split: how many covered by free uses vs paid
      const freeUsed = Math.min(user.freeUsageLeft, imageCount);
      const paidCount = imageCount - freeUsed;

      // --- Fully free path ---
      if (paidCount === 0) {
        user.freeUsageLeft -= freeUsed;
        await user.save({ transaction: t });

        const log = await UsageLog.create({
          userId, model, resolution: normalizedResolution,
          cost: 0, type: 'free', status: 'pending',
          page, config, inputData, imageCount, freeUsed
        }, { transaction: t });
        return { canProceed: true, type: 'free' as const, cost: 0, freeUsed, paidCount: 0, usageLogId: log.id };
      }

      // --- Needs payment: look up pricing ---
      const targetService = service || 'all';
      // When priceKey provided, also match by resolution for per-quality pricing (1k/2k/4k)
      let pricing = priceKey 
        ? await Pricing.findOne({ where: { model: priceKey, resolution: normalizedResolution, service: targetService }, transaction: t })
            ?? await Pricing.findOne({ where: { model: priceKey, service: targetService }, transaction: t })
        : await Pricing.findOne({ where: { model, resolution: normalizedResolution, service: targetService }, transaction: t });
      
      if (!pricing && targetService !== 'all') {
        pricing = priceKey 
          ? await Pricing.findOne({ where: { model: priceKey, resolution: normalizedResolution, service: 'all' }, transaction: t })
              ?? await Pricing.findOne({ where: { model: priceKey, service: 'all' }, transaction: t })
          : await Pricing.findOne({ where: { model, resolution: normalizedResolution, service: 'all' }, transaction: t });
      }
      
      if (!pricing) {
        const displayKey = priceKey || `${model} / ${normalizedResolution}`;
        return { 
          canProceed: false, type: 'paid' as const, cost: 0, freeUsed: 0, paidCount: 0,
          message: `Chưa cấu hình giá cho ${displayKey}. Liên hệ Admin.` 
        };
      }
      
      const cost = pricing.price * paidCount;

      // Balance check (guaranteed accurate because row is locked)
      if (user.balance < cost) {
        return { 
          canProceed: false, type: 'paid' as const, cost, freeUsed: 0, paidCount,
          message: `Số dư không đủ. Cần ${cost} credits cho ${paidCount} ảnh trả phí, hiện có ${user.balance} credits` 
        };
      }

      // --- Pre-deduct atomically (within locked transaction) ---
      user.freeUsageLeft -= freeUsed;
      user.balance -= cost;
      await user.save({ transaction: t });

      const billingType = freeUsed > 0 ? 'hybrid' : 'paid';
      const log = await UsageLog.create({
        userId, model, resolution: normalizedResolution,
        cost, type: billingType, status: 'pending',
        page, config, inputData, imageCount, freeUsed
      }, { transaction: t });

      return { canProceed: true, type: billingType as 'hybrid' | 'paid', cost, freeUsed, paidCount, usageLogId: log.id };
    });
  }

  /**
   * Mark generation as successful. No balance changes needed (already pre-deducted).
   * STABILIZATION: Truncates large base64 data to save DB space.
   */
  static async finalizeUsage(usageLogId: string, outputData?: any): Promise<boolean> {
    try {
      const log = await UsageLog.findByPk(usageLogId);
      if (!log || log.status !== 'pending') return false;

      log.status = 'success';
      // NEVER store outputData in DB — it contains multi-MB base64 PNG blobs.
      // Images are now served via Gommo CDN URLs. Logging the blob would exhaust disk.
      // Set to NULL to keep row for billing audit without the payload.
      log.outputData = undefined;
      
      await log.save();
      return true;
    } catch (dbErr: any) {
      // Emergency: if disk is full (53100), log the warning but don't fail the overall request.
      // delivering the image to the user is more important than the usage log.
      console.error(`⚠️ UsageService: Failed to finalize usage log (${dbErr.message?.slice(0, 200)})`);
      return false;
    }
  }

  /**
   * Mark generation as failed and refund pre-deducted amounts atomically.
   */
  static async failUsage(usageLogId: string, error?: string): Promise<void> {
    try {
      await sequelize.transaction(async (t: Transaction) => {
        const log = await UsageLog.findByPk(usageLogId, { transaction: t });
        if (!log || log.status !== 'pending') return;

        // Lock user row for refund
        const user = await User.findByPk(log.userId, { 
          lock: Transaction.LOCK.UPDATE, 
          transaction: t 
        });

        if (user) {
          // Refund free uses
          if (log.freeUsed > 0) {
            user.freeUsageLeft += log.freeUsed;
          }
          // Refund balance
          if (log.cost > 0) {
            user.balance += log.cost;
          }
          await user.save({ transaction: t });
        }

        log.status = 'failed';
        log.error = error?.slice(0, 1000); // Truncate long error messages
        await log.save({ transaction: t });
      });
    } catch (dbErr: any) {
      console.error(`⚠️ UsageService: Failed to log failure/refund (${dbErr.message?.slice(0, 200)})`);
      // Warning: if refund fails due to disk space, the user loses credits.
      // In production, we might want to retry this later.
    }
  }
}

export default UsageService;
