import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn } as jwt.SignOptions);
};

export const isFakePhone = (phone: string): boolean => {
  // Check for repeating digits like 111111111, 2222222222, etc.
  if (/^(\d)\1+$/.test(phone)) return true;
  // Check for common fake patterns if needed, for now just repeating digits
  return false;
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    if (isFakePhone(phone)) {
      res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (số ảo)' });
      return;
    }

    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'Số điện thoại đã được sử dụng' });
      return;
    }

    const user = await User.create({ name, phone, password });
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: { user: user.toSafeJSON(), token },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại và mật khẩu' });
      return;
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) {
      res.status(401).json({ success: false, message: 'Số điện thoại hoặc mật khẩu không đúng' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Số điện thoại hoặc mật khẩu không đúng' });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: { user: user.toSafeJSON(), token },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
};
