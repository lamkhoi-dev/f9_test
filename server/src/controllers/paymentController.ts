import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import User from '../models/User';
import PricingPackage from '../models/PricingPackage';
import PaymentOrder from '../models/PaymentOrder';
import sequelize from '../config/database';

// Helper to generate 5-character uppercase alphanumeric code
const generateOrderCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `F9R${result}`;
};

// 1. Get all packages (Public)
export const getPackages = async (_req: Request, res: Response) => {
  try {
    const packages = await PricingPackage.findAll({
      order: [['price', 'ASC']],
    });
    res.json({ success: true, data: packages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Create order (Authenticated)
export const createOrder = async (req: AuthRequest, res: Response) => {
  const transaction = await sequelize.transaction();
  try {
    const { packageId } = req.body;
    const userId = req.user?.id;

    if (!userId || userId === 'guest') {
      res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để thực hiện nạp' });
      await transaction.rollback();
      return;
    }

    const pkg = await PricingPackage.findByPk(packageId);
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Gói nạp không tồn tại' });
      await transaction.rollback();
      return;
    }

    // Generate unique orderCode
    let orderCode = generateOrderCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await PaymentOrder.findOne({ where: { orderCode }, transaction });
      if (!existing) {
        isUnique = true;
      } else {
        orderCode = generateOrderCode();
      }
      attempts++;
    }

    const order = await PaymentOrder.create(
      {
        userId,
        packageId: pkg.id,
        packageName: pkg.name,
        credits: pkg.credits,
        amount: pkg.price,
        orderCode,
        status: 'pending',
      },
      { transaction }
    );

    await transaction.commit();

    // Generate VietQR payload URL
    // MSB account: 80003282069, Name: TRAN VAN QUAN
    const vietQrUrl = `https://img.vietqr.io/image/MSB-80003282069-compact2.png?amount=${order.amount}&addInfo=${orderCode}&accountName=TRAN%20VAN%20QUAN`;

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        orderCode: order.orderCode,
        amount: order.amount,
        credits: order.credits,
        packageName: order.packageName,
        vietQrUrl,
        bankInfo: {
          bankName: 'MSB (Maritime Bank)',
          accountNumber: '80003282069',
          accountHolder: 'TRAN VAN QUAN',
        },
      },
    });
  } catch (error: any) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get order status polling (Authenticated)
export const getOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await PaymentOrder.findByPk(id as string);

    if (!order) {
      res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
      return;
    }

    // Ensure order belongs to current user (unless admin)
    if (order.userId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Quyền truy cập bị từ chối' });
      return;
    }

    res.json({
      success: true,
      status: order.status,
      credits: order.credits,
      amount: order.amount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. SePay Webhook listener (Public, token protected)
export const sepayWebhook = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const apiKeyHeader = req.headers['x-api-key'] || '';
  const querySecret = req.query.secret || '';

  const expectedSecret = 'f9rendering2024secret';

  const isAuthValid = 
    authHeader.includes(expectedSecret) || 
    apiKeyHeader === expectedSecret || 
    querySecret === expectedSecret;

  if (!isAuthValid) {
    console.warn('⚠️ SePay webhook unauthorized attempt');
    res.status(401).json({ success: false, message: 'Unauthorized webhook request' });
    return;
  }

  const dbTransaction = await sequelize.transaction();
  try {
    const { transactionContent, transferAmount } = req.body;
    console.log(`📥 Received SePay webhook: content="${transactionContent}", amount=${transferAmount}`);

    if (!transactionContent) {
      res.status(400).json({ success: false, message: 'Missing transactionContent' });
      await dbTransaction.rollback();
      return;
    }

    // Regex match to search orderCode (format F9RXXXXX, case-insensitive)
    const match = transactionContent.match(/F9R[A-Z0-9]{5}/i);
    if (!match) {
      console.warn(`⚠️ Could not parse order code from transactionContent: "${transactionContent}"`);
      res.status(200).json({ success: false, message: 'Could not find order code in content' });
      await dbTransaction.rollback();
      return;
    }

    const matchedCode = match[0].toUpperCase();
    const order = await PaymentOrder.findOne({
      where: { orderCode: matchedCode },
      transaction: dbTransaction,
      lock: true, // Row lock
    });

    if (!order) {
      console.warn(`⚠️ Order with code ${matchedCode} not found in database`);
      res.status(200).json({ success: false, message: `Order ${matchedCode} not found` });
      await dbTransaction.rollback();
      return;
    }

    if (order.status === 'completed') {
      console.log(`ℹ️ Order ${matchedCode} is already completed`);
      res.json({ success: true, message: 'Order already completed' });
      await dbTransaction.rollback();
      return;
    }

    const actualAmount = parseFloat(transferAmount);
    order.gatewayResponse = req.body;

    if (actualAmount < order.amount) {
      console.warn(`⚠️ Order ${matchedCode} paid amount (${actualAmount}) is less than expected (${order.amount})`);
      order.status = 'manual_check';
      await order.save({ transaction: dbTransaction });
      await dbTransaction.commit();
      res.json({ success: false, message: 'Amount mismatched, marked for manual check' });
      return;
    }

    // Update order status to completed
    order.status = 'completed';
    await order.save({ transaction: dbTransaction });

    // Update user balance and upgrade plan
    const user = await User.findByPk(order.userId, { transaction: dbTransaction, lock: true });
    if (user) {
      user.balance += order.credits;
      // If order package name is PRO or ULTRA, upgrade plan
      if (order.packageName === 'PRO' || order.packageName === 'ULTRA') {
        user.plan = 'pro';
      }
      await user.save({ transaction: dbTransaction });
      console.log(`✅ Granted ${order.credits} credits to user ${user.name} (${user.phone}), Plan upgraded to ${user.plan}`);
    } else {
      console.error(`❌ User ${order.userId} not found for order ${matchedCode}`);
    }

    await dbTransaction.commit();
    res.json({ success: true, message: 'Webhook processed successfully, credits granted' });
  } catch (error: any) {
    await dbTransaction.rollback();
    console.error('❌ Error handling SePay Webhook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Admin List Orders (Admin)
export const adminGetOrders = async (_req: AuthRequest, res: Response) => {
  try {
    const orders = await PaymentOrder.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'plan', 'balance'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Admin Force Approve Order (Admin Manual Override)
export const adminApproveOrder = async (req: AuthRequest, res: Response) => {
  const dbTransaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const order = await PaymentOrder.findByPk(id as string, { transaction: dbTransaction, lock: true });

    if (!order) {
      res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
      await dbTransaction.rollback();
      return;
    }

    if (order.status === 'completed') {
      res.status(400).json({ success: false, message: 'Đơn hàng đã được duyệt trước đó' });
      await dbTransaction.rollback();
      return;
    }

    // Force approve order
    order.status = 'completed';
    order.gatewayResponse = {
      approvedByAdmin: req.user?.phone || 'admin',
      approvedAt: new Date().toISOString(),
    };
    await order.save({ transaction: dbTransaction });

    // Grant credits
    const user = await User.findByPk(order.userId, { transaction: dbTransaction, lock: true });
    if (user) {
      user.balance += order.credits;
      if (order.packageName === 'PRO' || order.packageName === 'ULTRA') {
        user.plan = 'pro';
      }
      await user.save({ transaction: dbTransaction });
    }

    await dbTransaction.commit();
    res.json({ success: true, message: 'Duyệt đơn hàng và cộng credit thành công' });
  } catch (error: any) {
    await dbTransaction.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Admin Create Pricing Package (Admin)
export const adminCreatePackage = async (req: AuthRequest, res: Response) => {
  try {
    const { name, credits, price, originalPrice, discount, durationMonths, popular, theme, features } = req.body;
    
    const newPkg = await PricingPackage.create({
      name,
      credits: parseInt(credits, 10),
      price: parseFloat(price),
      originalPrice: parseFloat(originalPrice),
      discount,
      durationMonths: parseInt(durationMonths, 10) || 1,
      popular: !!popular,
      theme,
      features: Array.isArray(features) ? features : [],
    });

    res.status(201).json({ success: true, data: newPkg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Admin Update Pricing Package (Admin)
export const adminUpdatePackage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, credits, price, originalPrice, discount, durationMonths, popular, theme, features } = req.body;

    const pkg = await PricingPackage.findByPk(id as string);
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Gói pricing không tồn tại' });
      return;
    }

    await pkg.update({
      name,
      credits: parseInt(credits, 10),
      price: parseFloat(price),
      originalPrice: parseFloat(originalPrice),
      discount,
      durationMonths: parseInt(durationMonths, 10),
      popular: !!popular,
      theme,
      features: Array.isArray(features) ? features : [],
    });

    res.json({ success: true, data: pkg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Admin Delete Pricing Package (Admin)
export const adminDeletePackage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const pkg = await PricingPackage.findByPk(id as string);
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Gói pricing không tồn tại' });
      return;
    }

    await pkg.destroy();
    res.json({ success: true, message: 'Xóa gói pricing thành công' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
