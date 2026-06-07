import { Router } from 'express';
import {
  getPackages,
  createOrder,
  getOrderStatus,
  sepayWebhook,
  adminGetOrders,
  adminApproveOrder,
  adminCreatePackage,
  adminUpdatePackage,
  adminDeletePackage,
} from '../controllers/paymentController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

const router = Router();

// Public routes
router.get('/packages', getPackages);
router.post('/sepay-webhook', sepayWebhook);

// User authenticated routes
router.post('/create-order', authMiddleware, createOrder);
router.get('/order/:id', authMiddleware, getOrderStatus);

// Admin authenticated routes
router.get('/admin/orders', authMiddleware, adminMiddleware, adminGetOrders);
router.post('/admin/orders/:id/approve', authMiddleware, adminMiddleware, adminApproveOrder);
router.post('/admin/packages', authMiddleware, adminMiddleware, adminCreatePackage);
router.put('/admin/packages/:id', authMiddleware, adminMiddleware, adminUpdatePackage);
router.delete('/admin/packages/:id', authMiddleware, adminMiddleware, adminDeletePackage);

export default router;
