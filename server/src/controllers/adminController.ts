import { Request, Response } from 'express';
import VertexKey from '../models/VertexKey';
import Pricing from '../models/Pricing';
import AppConfig from '../models/AppConfig';
import UsageLog from '../models/UsageLog';
import User from '../models/User';

// --- User Management (Existing) ---
export const listUsers = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const { count, rows } = await User.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  res.json({
    success: true,
    data: {
      users: rows.map(u => u.toSafeJSON()),
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      }
    }
  });
};

export const createUser = async (req: Request, res: Response) => {
  const user = await User.create(req.body);
  res.json({ success: true, data: user.toSafeJSON() });
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  await User.update(req.body, { where: { id } });
  res.json({ success: true, message: 'User updated' });
};

export const updateBalance = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { balance } = req.body;
  await User.update({ balance }, { where: { id } });
  res.json({ success: true, message: 'Balance updated' });
};

export const updateRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  await User.update({ role }, { where: { id } });
  res.json({ success: true, message: 'Role updated' });
};

// --- Key Management (New) ---
export const getKeys = async (req: Request, res: Response) => {
  const keys = await VertexKey.findAll({ order: [['id', 'DESC']] });
  res.json({ success: true, data: keys });
};

export const createKey = async (req: Request, res: Response) => {
  try {
    const body = { ...req.body };
    if (typeof body.credentials === 'string') {
      try { body.credentials = JSON.parse(body.credentials); } catch (_) {}
    }

    // 1. Check duplicate by label
    const existingLabel = await VertexKey.findOne({ where: { label: body.label } });
    if (existingLabel) {
      return res.status(409).json({ success: false, message: `Key "${body.label}" đã tồn tại. Vui lòng dùng label khác.` });
    }

    // 2. Check duplicate by credential fingerprint (prevent adding same SA/key twice)
    const allKeys = await VertexKey.findAll();
    const newFingerprint = getCredentialFingerprint(body.credentials, body.keyType);
    const duplicate = allKeys.find(k => getCredentialFingerprint(k.credentials, k.keyType) === newFingerprint);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `Credentials này đã được dùng bởi key "${duplicate.label}". Không thể thêm trùng lặp.`
      });
    }

    const key = await VertexKey.create(body);
    res.json({ success: true, data: key });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/** Generate a unique fingerprint from credentials to detect duplicates */
function getCredentialFingerprint(credentials: any, keyType: string): string {
  if (!credentials) return '';
  if (keyType === 'service_account' && typeof credentials === 'object') {
    // SA: project_id + client_email uniquely identifies a key
    return `sa:${credentials.project_id}:${credentials.client_email}`;
  }
  // API key: use the raw value
  const raw = typeof credentials === 'string' ? credentials : JSON.stringify(credentials);
  return `apikey:${raw.trim()}`;
}


export const updateKey = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = { ...req.body };
  if (typeof body.credentials === 'string') {
    try { body.credentials = JSON.parse(body.credentials); } catch (_) {}
  }
  await VertexKey.update(body, { where: { id } });
  res.json({ success: true, message: 'Updated successfully' });
};

export const deleteKey = async (req: Request, res: Response) => {
  const { id } = req.params;
  await VertexKey.destroy({ where: { id } });
  res.json({ success: true, message: 'Deleted successfully' });
};

// --- Pricing Management (New) ---
export const getPricing = async (req: Request, res: Response) => {
  const pricing = await Pricing.findAll();
  res.json({ success: true, data: pricing });
};

export const updatePricing = async (req: Request, res: Response) => {
  const { id, model, resolution, service, price } = req.body;
  if (id) {
    await Pricing.update({ model, resolution, service: service || 'all', price }, { where: { id } });
  } else {
    await Pricing.upsert({ model, resolution, service: service || 'all', price });
  }
  res.json({ success: true, message: 'Pricing updated' });
};

export const deletePricing = async (req: Request, res: Response) => {
  const { id } = req.params;
  await Pricing.destroy({ where: { id } });
  res.json({ success: true, message: 'Pricing deleted' });
};

// --- App Config (New) ---
export const getConfigs = async (req: Request, res: Response) => {
  const configs = await AppConfig.findAll();
  res.json({ success: true, data: configs });
};

export const updateConfig = async (req: Request, res: Response) => {
  const { key, value } = req.body;
  await AppConfig.upsert({ key, value });
  res.json({ success: true, message: 'Config updated' });
};

// --- Statistics (New) ---
export const getStats = async (req: Request, res: Response) => {
  const totalUsers = await User.count();
  const totalGenerations = await UsageLog.count({ where: { status: 'success' } });
  const totalBalance = await User.sum('balance');

  res.json({
    success: true,
    data: {
      totalUsers,
      totalGenerations,
      totalBalance: totalBalance || 0,
    }
  });
};
