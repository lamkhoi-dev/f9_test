import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { UI_MODE_LABELS, UI_MODE_MODELS, UI_PRICE_KEYS, AppMode, SERVICE_KEYS, SERVICE_LABELS } from './contexts/ModeContext';
import apiClient from './lib/apiClient';
import { UsersIcon } from './components/icons/UsersIcon';
import { CurrencyIcon } from './components/icons/CurrencyIcon';
import { KeyIcon } from './components/icons/KeyIcon';
import { CpuChipIcon } from './components/icons/CpuChipIcon';
import { HomeIcon } from './components/icons/HomeIcon';
import { ArrowRightOnRectangleIcon } from './components/icons/ArrowRightOnRectangleIcon';
import { MagnifyingGlassIcon } from './components/icons/MagnifyingGlassIcon';
import { WalletIcon } from './components/icons/WalletIcon';
import { PencilIcon } from './components/icons/PencilIcon';
import { PlusIcon } from './components/icons/PlusIcon';
import { TrashIcon } from './components/icons/TrashIcon';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { ToastContainer, useToast } from './components/Toast';

interface AdminUser {
  id: string;
  phone: string;
  name: string;
  role: 'user' | 'admin';
  freeUsageLeft: number;
  dailyFreeLimit: number;
  balance: number;
  createdAt: string;
}

interface AdminPageProps {
  onNavigate: (page: string) => void;
}

type AdminTab = 'users' | 'pricing' | 'keys' | 'stats' | 'prompts';

interface PromptCategory {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

interface AdminPrompt {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  thumbnail: string;
  tier: 'free' | 'pro';
  sortOrder: number;
  isActive: boolean;
  categoryName?: string;
}

interface ApiKey {
  id: number;
  label: string;
  provider: string;
  keyType: 'api_key' | 'service_account';
  credentials: any;
  projectId?: string;
  status: 'active' | 'inactive' | 'limited' | 'error';
  dailyLimit: number;
  dailyUsed: number;
}

interface PricingItem {
  id: number;
  model: string;
  resolution: string;
  service: string;
  price: number;
}

interface ConfigItem {
  id: number;
  key: string;
  value: string;
  description: string;
}

const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const { isAdmin, user: currentUser, logout } = useAuth();
  const { toasts, dismiss, toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Modals State ---
  const [balanceModal, setBalanceModal] = useState<{ userId: string; userName: string } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', phone: '', password: '', role: 'user' as 'user' | 'admin' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editModal, setEditModal] = useState<AdminUser | null>(null);
  const [editData, setEditData] = useState({ name: '', password: '', balance: 0, role: 'user' as 'user' | 'admin', freeUsageLeft: 0, dailyFreeLimit: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Key Modal
  const [showKeyModal, setShowKeyModal] = useState<ApiKey | boolean>(false);
  const [keyFormData, setKeyFormData] = useState<Partial<ApiKey>>({ 
    label: '', provider: 'google', keyType: 'service_account', credentials: '', dailyLimit: 1000 
  });

  // Pricing Modal
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingForm, setPricingForm] = useState({ model: UI_PRICE_KEYS.PRO_4K, resolution: 'fixed', service: SERVICE_KEYS.ALL, price: 0 });
  const [pricingFilter, setPricingFilter] = useState<string>('__all__');
  const [editingPricingId, setEditingPricingId] = useState<number | null>(null);

  // Prompt Library State
  const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([]);
  const [adminPrompts, setAdminPrompts] = useState<AdminPrompt[]>([]);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AdminPrompt | null>(null);
  const [editingCategory, setEditingCategory] = useState<PromptCategory | null>(null);
  const [promptForm, setPromptForm] = useState({ title: '', content: '', thumbnail: '', categoryId: '', tier: 'free' as 'free' | 'pro', sortOrder: 0, isActive: true });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true });
  const [promptCategoryFilter, setPromptCategoryFilter] = useState<string>('__all__');

  // --- Fetchers ---
  const fetchUsers = async (pageNum: number = 1) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/admin/users?page=${pageNum}&limit=10`);
      if (res.data.data.users) {
        setUsers(res.data.data.users);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotal(res.data.data.pagination.total);
      } else {
        setUsers(res.data.data); // Legacy fallback
      }
      setPage(pageNum);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi tải danh sách user');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/admin/keys');
      setKeys(res.data.data);
    } finally { setIsLoading(false); }
  };

  const fetchPricing = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/admin/pricing');
      setPricing(res.data.data);
    } finally { setIsLoading(false); }
  };

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/admin/configs');
      setConfigs(res.data.data);
    } finally { setIsLoading(false); }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/admin/stats');
      setStats(res.data.data);
    } finally { setIsLoading(false); }
  };

  const fetchPromptCategories = async () => {
    try {
      const res = await apiClient.get('/admin/prompt-categories');
      setPromptCategories(res.data.data || []);
    } catch (err: any) {
      // If backend not ready yet, use local fallback
      setPromptCategories([
        { id: 'cat-1', name: 'Nhà Phố', description: 'Mẫu prompt nhà phố', sortOrder: 1, isActive: true },
        { id: 'cat-2', name: 'Biệt Thự', description: 'Mẫu prompt biệt thự', sortOrder: 2, isActive: true },
        { id: 'cat-3', name: 'Nội Thất', description: 'Mẫu prompt nội thất', sortOrder: 3, isActive: true },
      ]);
    }
  };

  const fetchAdminPrompts = async () => {
    try {
      const res = await apiClient.get('/admin/prompts');
      setAdminPrompts(res.data.data || []);
    } catch (err: any) {
      // Fallback for when backend isn't ready
      setAdminPrompts([]);
    }
  };

  const handleSavePrompt = async () => {
    try {
      if (editingPrompt) {
        await apiClient.put(`/admin/prompts/${editingPrompt.id}`, promptForm);
        toast.success('Cập nhật prompt thành công!');
      } else {
        await apiClient.post('/admin/prompts', promptForm);
        toast.success('Thêm prompt mới thành công!');
      }
      setShowPromptModal(false);
      setEditingPrompt(null);
      setPromptForm({ title: '', content: '', thumbnail: '', categoryId: '', tier: 'free', sortOrder: 0, isActive: true });
      fetchAdminPrompts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu prompt');
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa prompt này?')) return;
    try {
      await apiClient.delete(`/admin/prompts/${id}`);
      toast.success('Xóa prompt thành công!');
      fetchAdminPrompts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa prompt');
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await apiClient.put(`/admin/prompt-categories/${editingCategory.id}`, categoryForm);
        toast.success('Cập nhật chuyên mục thành công!');
      } else {
        await apiClient.post('/admin/prompt-categories', categoryForm);
        toast.success('Thêm chuyên mục mới thành công!');
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', sortOrder: 0, isActive: true });
      fetchPromptCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu chuyên mục');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Xóa chuyên mục sẽ xóa tất cả prompt bên trong. Tiếp tục?')) return;
    try {
      await apiClient.delete(`/admin/prompt-categories/${id}`);
      toast.success('Xóa chuyên mục thành công!');
      fetchPromptCategories();
      fetchAdminPrompts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa chuyên mục');
    }
  };

  const UI_MODE_OPTIONS = [
    { key: UI_PRICE_KEYS.PRO_1K, label: `${UI_MODE_LABELS.pro} (1K)` },
    { key: UI_PRICE_KEYS.PRO_2K, label: `${UI_MODE_LABELS.pro} (2K)` },
    { key: UI_PRICE_KEYS.PRO_4K, label: `${UI_MODE_LABELS.pro} (4K)` },
    { key: UI_PRICE_KEYS.BANANA2_1K, label: `${UI_MODE_LABELS.banana2} (1K)` },
    { key: UI_PRICE_KEYS.BANANA2_2K, label: `${UI_MODE_LABELS.banana2} (2K)` },
    { key: UI_PRICE_KEYS.BANANA2_4K, label: `${UI_MODE_LABELS.banana2} (4K)` },
  ];

  const getModeLabel = (key: string) => {
    const option = UI_MODE_OPTIONS.find(o => o.key === key);
    return option ? option.label : key;
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'keys') fetchKeys();
    else if (activeTab === 'pricing') fetchPricing();
    else if (activeTab === 'stats') { fetchStats(); fetchConfigs(); }
    else if (activeTab === 'prompts') { fetchPromptCategories(); fetchAdminPrompts(); }
  }, [isAdmin, activeTab]);

  // --- Handlers ---
  const handleUpdateBalance = async () => {
    if (!balanceModal || !balanceAmount) return;
    setIsUpdating(true);
    try {
      await apiClient.patch(`/admin/users/${balanceModal.userId}/balance`, {
        balance: parseFloat(balanceAmount),
      });
      setBalanceModal(null);
      setBalanceAmount('');
      fetchUsers(page);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật số dư');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.phone || !newUser.password) return;
    setIsCreating(true);
    setCreateError('');
    try {
      await apiClient.post('/admin/users', newUser);
      setShowCreateModal(false);
      setNewUser({ name: '', phone: '', password: '', role: 'user' });
      fetchUsers(page);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Lỗi khi tạo user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditUser = async () => {
    if (!editModal) return;
    setIsEditing(true);
    setEditError('');
    try {
      await apiClient.put(`/admin/users/${editModal.id}`, editData);
      setEditModal(null);
      fetchUsers(page);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Lỗi khi cập nhật user');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSaveKey = async () => {
    try {
      let creds = keyFormData.credentials;
      if (keyFormData.keyType === 'service_account' && typeof creds === 'string') {
        creds = JSON.parse(creds);
      }
      
      const payload = { ...keyFormData, credentials: creds };
      if (typeof showKeyModal === 'object') {
        await apiClient.put(`/admin/keys/${showKeyModal.id}`, payload);
      } else {
        await apiClient.post('/admin/keys', payload);
      }
      setShowKeyModal(false);
      fetchKeys();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const handleUpdatePrice = async (item: PricingItem, newPrice: number) => {
    try {
      await apiClient.post('/admin/pricing', { ...item, price: newPrice });
      fetchPricing();
    } catch (e: any) { toast.error(e.response?.data?.message || e.message); }
  };

  const handleDeletePricing = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa mục giá này?')) return;
    try {
      await apiClient.delete(`/admin/pricing/${id}`);
      fetchPricing();
    } catch (e: any) { toast.error(e.response?.data?.message || e.message); }
  };

  const handleUpdateConfig = async (item: ConfigItem, newValue: string) => {
    try {
      await apiClient.post('/admin/configs', { ...item, value: newValue });
      fetchConfigs();
    } catch (e: any) { toast.error(e.response?.data?.message || e.message); }
  };

  const openEditModal = (u: AdminUser) => {
    setEditModal(u);
    setEditData({ name: u.name, password: '', balance: u.balance, role: u.role, freeUsageLeft: u.freeUsageLeft, dailyFreeLimit: u.dailyFreeLimit || 0 });
    setEditError('');
  };

  const filteredUsers = searchQuery
    ? users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery)
      )
    : users;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white">
        <div className="text-center">
          <p className="text-2xl font-bold mb-4">Không có quyền truy cập</p>
          <button onClick={() => onNavigate('home')} className="text-orange-400 hover:text-orange-300">← Về trang chủ</button>
        </div>
      </div>
    );
  }

  const sidebarItems: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'stats', label: 'Thống kê', icon: <HomeIcon className="w-4 h-4" /> },
    { key: 'users', label: 'Người dùng', icon: <UsersIcon className="w-4 h-4" /> },
    { key: 'pricing', label: 'Bảng giá', icon: <CurrencyIcon className="w-4 h-4" /> },
    { key: 'keys', label: 'API Keys', icon: <KeyIcon className="w-4 h-4" /> },
    { key: 'prompts', label: 'Thư viện Prompt', icon: <BookOpenIcon className="w-4 h-4" /> },
  ];

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
        </div>
      );
    }

    if (activeTab === 'stats') {
      const globalFreeLimit = configs.find((c: ConfigItem) => c.key === 'defaultDailyFreeLimit');
      return (
        <div className="p-6 lg:p-8">
          <h2 className="text-xl font-bold text-white mb-6">Tổng quan hệ thống</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Người dùng</p>
              <h4 className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</h4>
            </div>
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Tổng lượt tạo AI thành công</p>
              <h4 className="text-3xl font-bold text-orange-500">{stats?.totalGenerations || 0}</h4>
            </div>
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Tổng số dư user</p>
              <h4 className="text-3xl font-bold text-emerald-500">{stats?.totalBalance || 0} credits</h4>
            </div>
          </div>

          {/* Global Daily Free Limit Config */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-white mb-4">⚙️ Cấu hình lượt miễn phí</h3>
            <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl max-w-md">
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Lượt free mặc định / ngày (toàn server)</label>
              <p className="text-[10px] text-gray-600 mb-3">Áp dụng cho user có "Lượt free/ngày = 0". User có giá trị riêng sẽ dùng giá trị riêng.</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  defaultValue={globalFreeLimit?.value || '0'}
                  id="globalDailyFreeLimit"
                  min="0"
                  className="flex-1 bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={() => {
                    const val = (document.getElementById('globalDailyFreeLimit') as HTMLInputElement)?.value || '0';
                    if (globalFreeLimit) {
                      handleUpdateConfig(globalFreeLimit, val);
                    } else {
                      // Create new config entry
                      apiClient.post('/admin/configs', { key: 'defaultDailyFreeLimit', value: val, description: 'Lượt free mặc định mỗi ngày cho toàn server' })
                        .then(() => fetchConfigs())
                        .catch((e: any) => toast.error(e.response?.data?.message || e.message));
                    }
                  }}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm transition-colors"
                >
                  Lưu
                </button>
              </div>
              {globalFreeLimit && (
                <p className="text-xs text-emerald-400 mt-2">Hiện tại: <span className="font-bold">{globalFreeLimit.value} lượt/ngày</span></p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'pricing') {
      return (
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CurrencyIcon className="w-5 h-5 text-orange-400" />
              Bảng giá dịch vụ
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={pricingFilter}
                onChange={(e) => setPricingFilter(e.target.value)}
                className="bg-[#111827] border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="__all__">Tất cả dịch vụ</option>
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setPricingForm({ model: UI_PRICE_KEYS.PRO_4K, resolution: 'fixed', service: SERVICE_KEYS.ALL, price: 0 });
                  setEditingPricingId(null);
                  setShowPricingModal(true);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" /> Thêm giá mới
              </button>
            </div>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase text-xs">Phân loại Model (UI)</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase text-xs">Loại Dịch vụ</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase text-xs">Giá (Credits)</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-500 uppercase text-xs">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {pricing.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center">
                      <CurrencyIcon className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">Chưa có bảng giá nào</p>
                      <p className="text-xs text-gray-600 mt-1">Nhấn nút <span className="text-orange-400 font-bold">"Thêm giá mới"</span> ở trên để thiết lập bảng giá.</p>
                    </td>
                  </tr>
                ) : pricing.filter(item => pricingFilter === '__all__' || item.service === pricingFilter).map(item => (
                  <tr key={item.id} className="hover:bg-[#1e293b]/50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">
                        {getModeLabel(item.model)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.service === 'all' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-purple-500/10 border-purple-500/30 text-purple-400'}`}>
                        {SERVICE_LABELS[item.service] || item.service}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-orange-400 font-mono text-lg font-bold">{item.price} credits</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                           onClick={() => {
                             setPricingForm({ model: item.model, resolution: item.resolution || 'fixed', service: item.service || 'all', price: item.price });
                             setEditingPricingId(item.id);
                             setShowPricingModal(true);
                           }}
                           className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 font-bold"
                        >
                          <PencilIcon className="w-3.5 h-3.5 inline mr-1" />Sửa
                        </button>
                        <button 
                           onClick={() => handleDeletePricing(item.id)}
                           className="text-xs bg-red-900/30 hover:bg-red-800/50 text-red-400 px-3 py-1.5 rounded-lg border border-red-800/50 font-bold"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showPricingModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[#1e293b] border border-gray-700 rounded-3xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <CurrencyIcon className="w-5 h-5 text-orange-400" />
                  {editingPricingId ? 'Sửa giá dịch vụ' : 'Thêm giá dịch vụ mới'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tên Model (Hiển thị UI)</label>
                    <select
                      value={pricingForm.model}
                      onChange={(e) => setPricingForm({ ...pricingForm, model: e.target.value, resolution: 'fixed' })}
                      className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">-- Chọn Model --</option>
                      {UI_MODE_OPTIONS.map(opt => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Loại Dịch vụ</label>
                    <select
                      value={pricingForm.service}
                      onChange={(e) => setPricingForm({ ...pricingForm, service: e.target.value })}
                      className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Giá mỗi lần tạo (Credits)</label>
                    <input
                      type="number"
                      value={pricingForm.price}
                      onChange={(e) => setPricingForm({ ...pricingForm, price: parseFloat(e.target.value) || 0 })}
                      placeholder="VD: 2000"
                      className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => { setShowPricingModal(false); setEditingPricingId(null); }}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      if (!pricingForm.model) {
                        toast.warning('Vui lòng chọn Model!');
                        return;
                      }
                      try {
                        await apiClient.post('/admin/pricing', { ...pricingForm, id: editingPricingId || undefined });
                        setShowPricingModal(false);
                        setEditingPricingId(null);
                        fetchPricing();
                      } catch (e: any) {
                        toast.error(e.response?.data?.message || e.message);
                      }
                    }}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm"
                  >
                    {editingPricingId ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'keys') {
      return (
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <KeyIcon className="w-5 h-5 text-orange-400" />
              Quản lý API Keys / Service Accounts
            </h2>
            <button 
              onClick={() => {
                setKeyFormData({ label: '', provider: 'google', keyType: 'service_account', credentials: '', dailyLimit: 1000 });
                setShowKeyModal(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" /> Thêm Key mới
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {keys.length === 0 ? (
              <div className="bg-[#111827] border border-gray-800 p-12 rounded-2xl text-center">
                <KeyIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-lg text-gray-400 font-medium">Chưa có API Key nào</p>
                <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">Thêm Service Account (JSON) hoặc API Key để hệ thống có thể gọi Vertex AI render ảnh. Nhấn nút <span className="text-orange-400 font-bold">"Thêm Key mới"</span> ở trên để bắt đầu.</p>
              </div>
            ) : keys.map(k => (
              <div key={k.id} className="bg-[#111827] border border-gray-800 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-white font-bold">{k.label}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      k.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
                      k.status === 'limited' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {k.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{k.provider} • {k.keyType} • {k.projectId || 'Shared Project'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-2">Đã dùng: <span className="text-white">{k.dailyUsed}</span> / {k.dailyLimit}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setKeyFormData({ ...k, credentials: typeof k.credentials === 'object' ? JSON.stringify(k.credentials, null, 2) : k.credentials });
                        setShowKeyModal(k);
                      }}
                      className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-500/20"
                    >
                      Sửa
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Xoá key này?')) {
                          await apiClient.delete(`/admin/keys/${k.id}`);
                          fetchKeys();
                        }
                      }}
                      className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/20"
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Configs tab removed per user request

    // --- PROMPTS TAB ---
    if (activeTab === 'prompts') {
      const filteredPrompts = promptCategoryFilter === '__all__' 
        ? adminPrompts 
        : adminPrompts.filter(p => p.categoryId === promptCategoryFilter);

      return (
        <div>
          {/* Categories Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Chuyên mục</h2>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', description: '', sortOrder: 0, isActive: true });
                  setShowCategoryModal(true);
                }}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Thêm chuyên mục
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {promptCategories.map(cat => (
                <div key={cat.id} className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-sm">{cat.name}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{cat.description}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {cat.isActive ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3">
                    <button 
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryForm({ name: cat.name, description: cat.description, sortOrder: cat.sortOrder, isActive: cat.isActive });
                        setShowCategoryModal(true);
                      }}
                      className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {promptCategories.length === 0 && (
                <p className="text-gray-500 text-sm col-span-3">Chưa có chuyên mục nào. Bấm "Thêm chuyên mục" để bắt đầu.</p>
              )}
            </div>
          </div>

          {/* Prompts Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Danh sách Prompt</h2>
                <select
                  value={promptCategoryFilter}
                  onChange={e => setPromptCategoryFilter(e.target.value)}
                  className="bg-[#1e293b] border border-gray-700 text-white text-xs rounded-lg px-3 py-1.5"
                >
                  <option value="__all__">Tất cả chuyên mục</option>
                  {promptCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setEditingPrompt(null);
                  setPromptForm({ title: '', content: '', thumbnail: '', categoryId: promptCategories[0]?.id || '', tier: 'free', sortOrder: 0, isActive: true });
                  setShowPromptModal(true);
                }}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Thêm prompt
              </button>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Thumbnail</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tiêu đề</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chuyên mục</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {filteredPrompts.length > 0 ? filteredPrompts.map(prompt => (
                      <tr key={prompt.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          {prompt.thumbnail ? (
                            <img src={prompt.thumbnail} alt={prompt.title} className="w-12 h-12 rounded-lg object-cover border border-gray-700" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">N/A</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium text-sm">{prompt.title}</p>
                          <p className="text-gray-500 text-xs line-clamp-1 mt-0.5 max-w-[300px]">{prompt.content}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {promptCategories.find(c => c.id === prompt.categoryId)?.name || prompt.categoryName || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            prompt.tier === 'pro' 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {prompt.tier === 'pro' ? '⭐ PRO' : 'FREE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${prompt.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {prompt.isActive ? 'Hiện' : 'Ẩn'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingPrompt(prompt);
                                setPromptForm({
                                  title: prompt.title,
                                  content: prompt.content,
                                  thumbnail: prompt.thumbnail,
                                  categoryId: prompt.categoryId,
                                  tier: prompt.tier,
                                  sortOrder: prompt.sortOrder,
                                  isActive: prompt.isActive,
                                });
                                setShowPromptModal(true);
                              }}
                              className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                              title="Sửa"
                            >
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(prompt.id)}
                              className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                              title="Xóa"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">
                          Chưa có prompt nào. Bấm "Thêm prompt" để bắt đầu tạo nội dung.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // --- USERS TAB (fallback) ---
    return (
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-orange-400" />
              Quản lý người dùng
            </h2>
            <p className="text-sm text-gray-500 mt-1">Tổng cộng {total} người dùng</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Thêm người dùng
          </button>
        </div>

        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên, số điện thoại..."
              className="w-full bg-[#1e293b] border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 placeholder-gray-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">{error}</div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên</th>
                      <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SĐT</th>
                      <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Số dư</th>
                      <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Lượt miễn phí</th>
                      <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#1e293b]/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-white">{u.name}</span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-300 font-mono text-xs">{u.phone}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`font-mono text-sm font-semibold ${u.balance > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                            {u.balance > 0 ? `${u.balance} credits` : '0'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`font-mono text-sm font-semibold ${u.freeUsageLeft > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                            {u.freeUsageLeft}
                          </span>
                          {(u.dailyFreeLimit > 0) && (
                            <span className="text-[10px] text-gray-500 ml-1">/ {u.dailyFreeLimit}/ngày</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setBalanceModal({ userId: u.id, userName: u.name })}
                              title="Nạp tiền"
                              className="p-2 rounded-lg hover:bg-green-500/10 text-gray-500 hover:text-green-400 transition-colors"
                            >
                              <WalletIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(u)}
                              title="Chỉnh sửa user"
                              className="p-2 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-5">
                <span className="text-xs text-gray-500">Trang {page} / {totalPages}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fetchUsers(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e293b] text-gray-400 hover:text-white border border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => fetchUsers(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        page === i + 1
                          ? 'bg-orange-500 text-white'
                          : 'bg-[#1e293b] text-gray-400 hover:text-white border border-gray-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => fetchUsers(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e293b] text-gray-400 hover:text-white border border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );

  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Sidebar */}
      <aside className="w-56 bg-[#0f172a] border-r border-gray-800 flex flex-col min-h-screen fixed left-0 top-0 bottom-0 z-20">
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-xs">F9</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">F9 ADMIN</h1>
              <p className="text-[10px] text-gray-500">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.key
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800 space-y-2">
          <div className="px-3 py-2">
            <p className="text-xs text-gray-400 truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-gray-600">{currentUser?.phone}</p>
          </div>
          <button
            onClick={() => onNavigate('home')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
          >
            <HomeIcon className="w-4 h-4" />
            <span>Về trang chủ</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-56">
        {renderTabContent()}
      </main>

      {/* Balance Modal */}
      {balanceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setBalanceModal(null)}>
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-green-400" />
              Nạp tiền cho {balanceModal.userName}
            </h3>
            <input
              type="number"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              placeholder="Nhập số tiền (VD: 50000)"
              className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setBalanceModal(null)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                Hủy
              </button>
              <button
                onClick={handleUpdateBalance}
                disabled={isUpdating || !balanceAmount}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:bg-gray-600"
              >
                {isUpdating ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-orange-400" />
              Thêm người dùng
            </h3>

            {createError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg mb-3 text-sm">{createError}</div>
            )}

            <div className="space-y-3">
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Họ và tên"
                className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="Số điện thoại"
                className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Mật khẩu"
                className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'user' | 'admin' })}
                className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                Hủy
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isCreating || !newUser.name || !newUser.phone || !newUser.password}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-600"
              >
                {isCreating ? 'Đang tạo...' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PencilIcon className="w-5 h-5 text-blue-400" />
              Chỉnh sửa — {editModal.name}
            </h3>

            {editError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg mb-3 text-sm">{editError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">SĐT</label>
                <p className="text-sm text-gray-300 font-mono bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2.5">{editModal.phone}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tên</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mật khẩu mới <span className="text-gray-600">(để trống = không đổi)</span></label>
                <input
                  type="password"
                  value={editData.password}
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                  placeholder="••••••"
                  className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Số dư (credits)</label>
                  <input
                    type="number"
                    value={editData.balance}
                    onChange={(e) => setEditData({ ...editData, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Role</label>
                  <select
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value as 'user' | 'admin' })}
                    className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Lượt free/ngày <span className="text-gray-600">(0 = dùng mặc định server)</span></label>
                <input
                  type="number"
                  value={editData.dailyFreeLimit}
                  onChange={(e) => setEditData({ ...editData, dailyFreeLimit: parseInt(e.target.value) || 0 })}
                  placeholder="0 = dùng mặc định"
                  className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Lượt miễn phí hiện tại</label>
                <p className="text-sm text-yellow-400 font-mono bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2.5">{editData.freeUsageLeft}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                Hủy
              </button>
              <button
                onClick={handleEditUser}
                disabled={isEditing}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:bg-gray-600"
              >
                {isEditing ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowKeyModal(false)}>
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <KeyIcon className="w-5 h-5 text-orange-400" />
              {typeof showKeyModal === 'object' ? 'Sửa API Key' : 'Thêm API Key mới'}
            </h3>

            <div className="space-y-4">
              {/* Loại Key - Always visible */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Loại Key</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKeyFormData({ ...keyFormData, keyType: 'service_account', credentials: '', projectId: '', label: keyFormData.label })}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      keyFormData.keyType === 'service_account'
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-lg shadow-orange-500/10'
                        : 'bg-[#0f172a] border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    📄 Service Account (JSON)
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeyFormData({ ...keyFormData, keyType: 'api_key', credentials: '', projectId: '', label: keyFormData.label })}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      keyFormData.keyType === 'api_key'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10'
                        : 'bg-[#0f172a] border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    🔑 API Key (String)
                  </button>
                </div>
              </div>

              {/* Tên gợi nhớ */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tên gợi nhớ (Label)</label>
                <input
                  type="text"
                  value={keyFormData.label}
                  onChange={(e) => setKeyFormData({ ...keyFormData, label: e.target.value })}
                  placeholder="VD: Google Vertex AI Main"
                  className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* === SERVICE ACCOUNT MODE === */}
              {keyFormData.keyType === 'service_account' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">Tải lên file JSON</label>
                    <label
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-orange-500/60 hover:bg-orange-500/5 border-gray-600 bg-[#0f172a]/50"
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-orange-500', 'bg-orange-500/10'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-orange-500', 'bg-orange-500/10'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-orange-500', 'bg-orange-500/10');
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.name.endsWith('.json')) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            try {
                              const json = JSON.parse(ev.target?.result as string);
                              setKeyFormData({
                                ...keyFormData,
                                credentials: json,
                                projectId: json.project_id || keyFormData.projectId,
                                label: keyFormData.label || `SA: ${json.client_email?.split('@')[0] || file.name.replace('.json', '')}`,
                              });
                              } catch { toast.error('File JSON không hợp lệ!'); }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    >
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              try {
                                const json = JSON.parse(ev.target?.result as string);
                                setKeyFormData({
                                  ...keyFormData,
                                  credentials: json,
                                  projectId: json.project_id || keyFormData.projectId,
                                  label: keyFormData.label || `SA: ${json.client_email?.split('@')[0] || file.name.replace('.json', '')}`,
                                });
                                } catch { toast.error('File JSON không hợp lệ!'); }
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                      {typeof keyFormData.credentials === 'object' && keyFormData.credentials && Object.keys(keyFormData.credentials).length > 0 ? (
                        <div className="text-center">
                          <span className="text-2xl">✅</span>
                          <p className="text-sm text-green-400 font-bold mt-1">File đã tải lên thành công</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Nhấp để chọn file khác</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-2xl">📁</span>
                          <p className="text-xs text-gray-400 mt-1">Kéo thả file <span className="text-orange-400 font-bold">.json</span> vào đây</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">hoặc nhấp để chọn file</p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Auto-detected info */}
                  {typeof keyFormData.credentials === 'object' && keyFormData.credentials && (keyFormData.credentials as any).project_id && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl space-y-2">
                      <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">🔍 Tự động phát hiện</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-gray-500">Project ID</p>
                          <p className="text-xs text-white font-mono">{(keyFormData.credentials as any).project_id}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Client Email</p>
                          <p className="text-xs text-white font-mono truncate">{(keyFormData.credentials as any).client_email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* === API KEY MODE === */}
              {keyFormData.keyType === 'api_key' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">API Key</label>
                    <input
                      type="password"
                      value={typeof keyFormData.credentials === 'string' ? keyFormData.credentials : ''}
                      onChange={(e) => setKeyFormData({ ...keyFormData, credentials: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Giới hạn hàng ngày - Always visible */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Giới hạn hàng ngày</label>
                <input
                  type="number"
                  value={keyFormData.dailyLimit}
                  onChange={(e) => setKeyFormData({ ...keyFormData, dailyLimit: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {typeof showKeyModal === 'object' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Trạng thái</label>
                  <select
                    value={keyFormData.status}
                    onChange={(e) => setKeyFormData({ ...keyFormData, status: e.target.value as any })}
                    className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="limited">Limited (Rate Limit)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowKeyModal(false)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                Hủy
              </button>
              <button
                onClick={handleSaveKey}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                {typeof showKeyModal === 'object' ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PROMPT CRUD MODAL --- */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center" onClick={() => setShowPromptModal(false)}>
          <div className="bg-[#111827] border border-gray-700 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-white text-lg font-bold mb-4">
              {editingPrompt ? 'Chỉnh sửa Prompt' : 'Thêm Prompt mới'}
            </h3>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Tiêu đề</label>
                <input
                  type="text"
                  value={promptForm.title}
                  onChange={e => setPromptForm({ ...promptForm, title: e.target.value })}
                  className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="VD: Mẫu nhà phố hiện đại 1"
                />
              </div>

              {/* Content (Prompt text) */}
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Nội dung Prompt</label>
                <textarea
                  value={promptForm.content}
                  onChange={e => setPromptForm({ ...promptForm, content: e.target.value })}
                  rows={6}
                  className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors resize-none"
                  placeholder="Nhập nội dung prompt kiến trúc..."
                />
              </div>

              {/* Thumbnail URL */}
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">URL Ảnh đại diện (Thumbnail)</label>
                <input
                  type="text"
                  value={promptForm.thumbnail}
                  onChange={e => setPromptForm({ ...promptForm, thumbnail: e.target.value })}
                  className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="https://... hoặc /uploads/..."
                />
                {promptForm.thumbnail && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={promptForm.thumbnail} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-gray-700" onError={(e: any) => { e.target.style.display = 'none'; }} />
                    <span className="text-gray-500 text-xs">Preview</span>
                  </div>
                )}
              </div>

              {/* Category + Tier Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Chuyên mục</label>
                  <select
                    value={promptForm.categoryId}
                    onChange={e => setPromptForm({ ...promptForm, categoryId: e.target.value })}
                    className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  >
                    <option value="">-- Chọn --</option>
                    {promptCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Tier (Phân loại)</label>
                  <select
                    value={promptForm.tier}
                    onChange={e => setPromptForm({ ...promptForm, tier: e.target.value as 'free' | 'pro' })}
                    className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  >
                    <option value="free">🟢 FREE</option>
                    <option value="pro">⭐ PRO</option>
                  </select>
                </div>
              </div>

              {/* Sort Order + Active Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={promptForm.sortOrder}
                    onChange={e => setPromptForm({ ...promptForm, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Trạng thái</label>
                  <select
                    value={promptForm.isActive ? 'true' : 'false'}
                    onChange={e => setPromptForm({ ...promptForm, isActive: e.target.value === 'true' })}
                    className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  >
                    <option value="true">✅ Hiển thị</option>
                    <option value="false">❌ Ẩn</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPromptModal(false)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                Hủy
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={!promptForm.title || !promptForm.content || !promptForm.categoryId}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {editingPrompt ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CATEGORY CRUD MODAL --- */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center" onClick={() => setShowCategoryModal(false)}>
          <div className="bg-[#111827] border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white text-lg font-bold mb-4">
              {editingCategory ? 'Chỉnh sửa Chuyên mục' : 'Thêm Chuyên mục mới'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Tên chuyên mục</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="VD: Nhà Phố, Biệt Thự, Nội Thất..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Mô tả</label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  placeholder="Mô tả ngắn về chuyên mục..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Thứ tự</label>
                  <input
                    type="number"
                    value={categoryForm.sortOrder}
                    onChange={e => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Trạng thái</label>
                  <select
                    value={categoryForm.isActive ? 'true' : 'false'}
                    onChange={e => setCategoryForm({ ...categoryForm, isActive: e.target.value === 'true' })}
                    className="w-full bg-[#0b1120] border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none transition-colors"
                  >
                    <option value="true">✅ Hoạt động</option>
                    <option value="false">❌ Ẩn</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                Hủy
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!categoryForm.name}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {editingCategory ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
