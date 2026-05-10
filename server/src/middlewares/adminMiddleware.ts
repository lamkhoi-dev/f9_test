import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền truy cập' });
    return;
  }
  next();
};
