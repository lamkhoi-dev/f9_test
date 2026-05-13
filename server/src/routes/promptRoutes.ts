import { Router } from 'express';
import { listPrompts, listCategories } from '../controllers/promptController';

const router = Router();

// Public routes — optionally extract user plan from token
router.get('/categories', listCategories);
router.get('/', listPrompts);

export default router;
