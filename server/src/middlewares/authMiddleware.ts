import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // REQUIRE_AUTH=false → allow unauthenticated access (guest mode)
    if (process.env.REQUIRE_AUTH === 'false' && (!authHeader || !authHeader.startsWith('Bearer '))) {
      req.user = { id: 'guest', name: 'Guest', phone: '', role: 'user', balance: 0, freeUsageLeft: 999 };
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Không có token xác thực' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ success: false, message: 'JWT_SECRET not configured' });
      return;
    }

    const decoded = jwt.verify(token, secret) as { id: string };
    const user = await User.findByPk(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: 'User không tồn tại' });
      return;
    }

    req.user = user.toSafeJSON();
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
};
