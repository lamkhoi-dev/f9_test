import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import aiRoutes from './aiRoutes';
import historyRoutes from './historyRoutes';
import geminiRoutes from './geminiRoutes';
import { getPricing } from '../controllers/adminController';
import { legacyGenerateContent, legacyGenerateContentStream } from '../controllers/legacyController';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'F9 Rendering API is running',
    version: 'v4-unified-backend',
    build: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  });
});

// Public pricing endpoint (no auth required)
router.get('/pricing', getPricing);

// Legacy endpoints — backward compatible with current f9 frontend (no auth)
router.post('/generate-content', legacyGenerateContent);
router.post('/generate-content-stream', legacyGenerateContentStream);

// Route modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);
router.use('/gemini', geminiRoutes);
router.use('/history', historyRoutes);

export default router;

