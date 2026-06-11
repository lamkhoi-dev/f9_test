import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
import {
  adminGetSlides, adminCreateSlide, adminUpdateSlide, adminDeleteSlide,
  adminGetShowcaseTabs, adminUpdateShowcaseTab,
  adminGetFeatureCards, adminUpdateFeatureCard,
  adminGetBlogPosts, adminCreateBlogPost, adminUpdateBlogPost, adminDeleteBlogPost,
} from '../controllers/landingController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

// Prompt thumbnail upload config
const thumbnailStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads/thumbnails')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const uploadThumbnail = multer({ storage: thumbnailStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Landing image upload config
const landingUploadDir = path.join(__dirname, '../../uploads/landing');
if (!fs.existsSync(landingUploadDir)) fs.mkdirSync(landingUploadDir, { recursive: true });
const landingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, landingUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const uploadLanding = multer({ storage: landingStorage, limits: { fileSize: 10 * 1024 * 1024 } });

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

// Prompt thumbnail upload
router.post('/prompts/upload-thumbnail', uploadThumbnail.single('thumbnail'), (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: 'No file uploaded' }); return; }
  const url = `/uploads/thumbnails/${req.file.filename}`;
  res.json({ success: true, data: { url } });
});

// ─── Landing Content ──────────────────────────────────────────────────────────

// Landing image upload (shared for all landing sections)
router.post('/landing/upload-image', uploadLanding.single('image'), (req, res) => {
  if (!req.file) { res.status(400).json({ success: false, error: 'No file uploaded' }); return; }
  const url = `/uploads/landing/${req.file.filename}`;
  res.json({ success: true, data: { url } });
});

// Slides (Hero Slider)
router.get('/landing/slides', adminGetSlides);
router.post('/landing/slides', adminCreateSlide);
router.put('/landing/slides/:id', adminUpdateSlide);
router.delete('/landing/slides/:id', adminDeleteSlide);

// Showcase Tabs (Architecture / Interior / Landscape)
router.get('/landing/showcase-tabs', adminGetShowcaseTabs);
router.put('/landing/showcase-tabs/:id', adminUpdateShowcaseTab);

// Feature Cards (Advanced Features)
router.get('/landing/feature-cards', adminGetFeatureCards);
router.put('/landing/feature-cards/:id', adminUpdateFeatureCard);

// Blog Posts
router.get('/landing/blog-posts', adminGetBlogPosts);
router.post('/landing/blog-posts', adminCreateBlogPost);
router.put('/landing/blog-posts/:id', adminUpdateBlogPost);
router.delete('/landing/blog-posts/:id', adminDeleteBlogPost);

export default router;
