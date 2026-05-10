import { Router } from 'express';
import { generateImage, checkStatus } from '../controllers/aiController';
import { analyzeContent } from '../controllers/analyzeController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All AI routes require authentication
router.use(authMiddleware);

router.post('/generate', generateImage);
router.get('/status/:taskId', checkStatus);

// Dedicated synchronous analysis endpoint (vision + text → JSON/text)
router.post('/analyze', analyzeContent);

export default router;
