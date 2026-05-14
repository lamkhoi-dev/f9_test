import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

interface PurchasePersonalKeyProps {
  isOpen: boolean;
  onClose: () => void;
}

const PurchasePersonalKey: React.FC<PurchasePersonalKeyProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser, hasPersonalKey } = useAuth();
  const [price, setPrice] = useState<number>(50);
  const [isLoading, setIsLoading] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccess(false);

    const fetchPrice = async () => {
      setIsPriceLoading(true);
      try {
        const res = await apiClient.get('/admin/configs');
        const configs = res.data.data || [];
        const priceConfig = configs.find((c: any) => c.key === 'personal_key_price');
        if (priceConfig) setPrice(parseFloat(priceConfig.value) || 50);
      } catch {
        // fallback to default price
      } finally {
        setIsPriceLoading(false);
      }
    };
    fetchPrice();
  }, [isOpen]);

  const handlePurchase = async () => {
    setIsLoading(true);
    setError('');
    try {
      await apiClient.post('/purchase/personal-key');
      setSuccess(true);
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi mua Key. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const userBalance = user?.balance || 0;
  const canAfford = userBalance >= price;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#1e293b] border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔑</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Kích hoạt thành công!</h3>
            <p className="text-gray-400 text-sm mb-6">
              Key cá nhân đã được mở. Bạn có thể cấu hình API Key riêng trong phần cài đặt AI.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors"
            >
              Đóng
            </button>
          </div>
        ) : hasPersonalKey ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Đã kích hoạt</h3>
            <p className="text-gray-400 text-sm mb-6">
              Bạn đã sở hữu Key cá nhân. Vào phần cài đặt AI để cấu hình.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-sm transition-colors"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">🔑</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Mua Key Cá Nhân</h3>
                <p className="text-xs text-gray-400">Sử dụng API Key riêng của bạn</p>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-bold text-white mb-3">Quyền lợi khi mua Key:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Sử dụng API Key cá nhân (Google Vertex AI)</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Không giới hạn lượt tạo (tùy quota API)</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Tốc độ xử lý nhanh hơn</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Không phụ thuộc key hệ thống</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Giá</span>
                {isPriceLoading ? (
                  <span className="text-gray-500 text-sm">Đang tải...</span>
                ) : (
                  <span className="text-xl font-bold text-orange-400">{price} credits</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Số dư hiện tại</span>
                <span className={`text-sm font-mono font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                  {userBalance} credits
                </span>
              </div>
              {!canAfford && (
                <p className="text-xs text-red-400 mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  ⚠️ Bạn cần thêm {(price - userBalance).toFixed(0)} credits để mua Key.
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handlePurchase}
                disabled={isLoading || !canAfford || isPriceLoading}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Đang xử lý...
                  </span>
                ) : (
                  `Mua — ${price} credits`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PurchasePersonalKey;
