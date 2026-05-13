import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { 
  listUsers, updateBalance, updateRole, createUser, updateUser,
  getKeys, createKey, updateKey, deleteKey,
  getPricing, updatePricing, deletePricing,
  getConfigs, updateConfig,
  getStats
} from '../controllers/adminController';
import {
  adminListCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
  adminListPrompts, adminCreatePrompt, adminUpdatePrompt, adminDeletePrompt,
} from '../controllers/promptController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

// Thumbnail upload config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads/thumbnails')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware, adminMiddleware);

// Users
router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/balance', updateBalance);
router.patch('/users/:id/role', updateRole);

// Keys
router.get('/keys', getKeys);
router.post('/keys', createKey);
router.put('/keys/:id', updateKey);
router.delete('/keys/:id', deleteKey);

// Pricing
router.get('/pricing', getPricing);
router.post('/pricing', updatePricing);
router.delete('/pricing/:id', deletePricing);

// Configs
router.get('/configs', getConfigs);
router.post('/configs', updateConfig);

// Stats
router.get('/stats', getStats);

// Prompt Categories
router.get('/prompt-categories', adminListCategories);
router.post('/prompt-categories', adminCreateCategory);
router.put('/prompt-categories/:id', adminUpdateCategory);
router.delete('/prompt-categories/:id', adminDeleteCategory);

// Prompts
router.get('/prompts', adminListPrompts);
router.post('/prompts', adminCreatePrompt);
router.put('/prompts/:id', adminUpdatePrompt);
router.delete('/prompts/:id', adminDeletePrompt);

// Thumbnail upload
router.post('/prompts/upload-thumbnail', upload.single('thumbnail'), (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: 'No file uploaded' }); return; }
  const url = `/uploads/thumbnails/${req.file.filename}`;
  res.json({ success: true, data: { url } });
});

export default router;
