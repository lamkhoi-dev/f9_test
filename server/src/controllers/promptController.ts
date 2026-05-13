import { Request, Response } from 'express';
import Prompt from '../models/Prompt';
import PromptCategory from '../models/PromptCategory';

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
    res.status(500).json({ success: false, error: error.message });
  }
};

export const listPrompts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.query;
    const userPlan = (req as any).userPlan || 'free'; // injected by optional auth middleware

    const where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;

    const prompts = await Prompt.findAll({
      where,
      include: [{ model: PromptCategory, as: 'category', attributes: ['id', 'name'] }],
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });

    // For FREE users: hide prompt content for PRO-tier prompts
    const data = prompts.map(p => {
      const json = p.toJSON() as any;
      if (userPlan === 'free' && json.tier === 'pro') {
        json.content = ''; // hide prompt text
        json.locked = true;
      }
      return json;
    });

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[listPrompts] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Admin CRUD: Categories ───

export const adminListCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await PromptCategory.findAll({
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
      include: [{ model: Prompt, as: 'prompts', attributes: ['id'] }],
    });
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminCreateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, sortOrder } = req.body;
    if (!name) { res.status(400).json({ success: false, error: 'Name is required' }); return; }
    const category = await PromptCategory.create({ name, description, sortOrder: sortOrder || 0 });
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminUpdateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const category = await PromptCategory.findByPk(id);
    if (!category) { res.status(404).json({ success: false, error: 'Category not found' }); return; }
    await category.update(req.body);
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminDeleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const count = await Prompt.count({ where: { categoryId: id } });
    if (count > 0) {
      res.status(400).json({ success: false, error: `Cannot delete: ${count} prompts still in this category` });
      return;
    }
    await PromptCategory.destroy({ where: { id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Admin CRUD: Prompts ───

export const adminListPrompts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.query;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;

    const prompts = await Prompt.findAll({
      where,
      include: [{ model: PromptCategory, as: 'category', attributes: ['id', 'name'] }],
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json({ success: true, data: prompts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminCreatePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, title, content, thumbnail, tier, sortOrder } = req.body;
    if (!categoryId || !title || !content) {
      res.status(400).json({ success: false, error: 'categoryId, title, content are required' });
      return;
    }
    const prompt = await Prompt.create({
      categoryId, title, content,
      thumbnail: thumbnail || '',
      tier: tier || 'free',
      sortOrder: sortOrder || 0,
    });
    res.status(201).json({ success: true, data: prompt });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminUpdatePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findByPk(id);
    if (!prompt) { res.status(404).json({ success: false, error: 'Prompt not found' }); return; }
    await prompt.update(req.body);
    res.json({ success: true, data: prompt });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const adminDeletePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Prompt.destroy({ where: { id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Purchase: Personal Key ───

export const purchasePersonalKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const User = (await import('../models/User')).default;
    const AppConfig = (await import('../models/AppConfig')).default;

    const userId = (req as any).userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const user = await User.findByPk(userId);
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

    if (user.hasPersonalKey) {
      res.json({ success: true, message: 'Already purchased', data: user.toSafeJSON() });
      return;
    }

    // Get price from config
    const priceConfig = await AppConfig.findOne({ where: { key: 'personal_key_price' } });
    const price = priceConfig ? parseFloat(priceConfig.value) : 100;

    if (user.balance < price) {
      res.status(400).json({
        success: false,
        error: `Không đủ credit. Cần ${price} credits, bạn có ${user.balance} credits.`,
      });
      return;
    }

    // Deduct and unlock
    user.balance -= price;
    user.hasPersonalKey = true;
    await user.save();

    res.json({ success: true, message: 'Mua thành công!', data: user.toSafeJSON() });
  } catch (error: any) {
    console.error('[purchasePersonalKey] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
