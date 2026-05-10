import { Router } from 'express';
import { getHistory } from '../controllers/historyController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Get user's own history
router.get('/', authMiddleware, getHistory);

export default router;
