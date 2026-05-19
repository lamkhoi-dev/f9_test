import { Request, Response } from 'express';
// Import via index to ensure all associations (hasMany/belongsTo) are registered
import db from '../models';
const Prompt = db.Prompt;
const PromptCategory = db.PromptCategory;

// ─── Public endpoints ───

export const listCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await PromptCategory.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('[listCategories] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listPrompts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.query;
    const userPlan = (req as any).userPlan || 'free';

    const where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;

    const prompts = await Prompt.findAll({
      where,
      include: [{ model: PromptCategory, as: 'category', attributes: ['id', 'name'] }],
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });

    const data = prompts.map(p => {
      const json = p.toJSON() as any;
      if (userPlan === 'free' && json.tier === 'pro') {
        json.content = '';
        json.locked = true;
      }
      return json;
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[listPrompts] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin CRUD: Categories ───

export const adminListCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await PromptCategory.findAll({
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('[adminListCategories] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminCreateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, sortOrder } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Tên chuyên mục không được để trống' });
      return;
    }
    const category = await PromptCategory.create({ name, description, sortOrder: sortOrder || 0 });
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminUpdateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const category = await PromptCategory.findByPk(id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Không tìm thấy chuyên mục' });
      return;
    }
    await category.update(req.body);
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminDeleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Cascade: delete all prompts in this category first
    await Prompt.destroy({ where: { categoryId: id } });
    await PromptCategory.destroy({ where: { id } });
    res.json({ success: true, message: 'Đã xóa chuyên mục và tất cả prompt bên trong' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin CRUD: Prompts ───

export const adminListPrompts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.query;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId as string;

    // Note: no 'include' here to avoid association timing issues.
    // The frontend resolves category names from its own promptCategories state.
    const prompts = await Prompt.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json({ success: true, data: prompts });
  } catch (error: any) {
    console.error('[adminListPrompts] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminCreatePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, title, content, thumbnail, tier, sortOrder } = req.body;

    if (!categoryId || !title || !content) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng điền đủ: chuyên mục, tiêu đề, nội dung prompt',
      });
      return;
    }

    // Verify category exists
    const category = await PromptCategory.findByPk(String(categoryId));
    if (!category) {
      res.status(400).json({ success: false, message: 'Chuyên mục không tồn tại' });
      return;
    }

    const prompt = await Prompt.create({
      categoryId,
      title,
      content,
      thumbnail: thumbnail || '',
      tier: tier || 'free',
      sortOrder: sortOrder || 0,
    });
    res.status(201).json({ success: true, data: prompt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminUpdatePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const prompt = await Prompt.findByPk(id);
    if (!prompt) {
      res.status(404).json({ success: false, message: 'Không tìm thấy prompt' });
      return;
    }
    await prompt.update(req.body);
    res.json({ success: true, data: prompt });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminDeletePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Prompt.destroy({ where: { id } });
    res.json({ success: true, message: 'Đã xóa prompt' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Purchase: Personal Key ───

export const purchasePersonalKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const User = (await import('../models/User')).default;
    const AppConfig = (await import('../models/AppConfig')).default;

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.hasPersonalKey) {
      res.json({ success: true, message: 'Already purchased', data: user.toSafeJSON() });
      return;
    }

    const priceConfig = await AppConfig.findOne({ where: { key: 'personal_key_price' } });
    const price = priceConfig ? parseFloat(priceConfig.value) : 100;

    if (user.balance < price) {
      res.status(400).json({
        success: false,
        message: `Không đủ credit. Cần ${price} credits, bạn có ${user.balance} credits.`,
      });
      return;
    }

    user.balance -= price;
    user.hasPersonalKey = true;
    await user.save();

    res.json({ success: true, message: 'Mua thành công!', data: user.toSafeJSON() });
  } catch (error: any) {
    console.error('[purchasePersonalKey] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
