import { Router } from 'express';
import { 
  listUsers, updateBalance, updateRole, createUser, updateUser,
  getKeys, createKey, updateKey, deleteKey,
  getPricing, updatePricing, deletePricing,
  getConfigs, updateConfig,
  getStats
} from '../controllers/adminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

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

export default router;
