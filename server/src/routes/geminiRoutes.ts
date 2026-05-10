import { Router } from 'express';
import { describeImage } from '../controllers/geminiController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All gemini routes require authentication
router.use(authMiddleware);

/**
 * Mô tả ảnh (describe)
 * POST /api/gemini/describe-image
 * Model: gemini-2.5-flash / gemini-2.0-flash
 */
router.post('/describe-image', describeImage);

export default router;
