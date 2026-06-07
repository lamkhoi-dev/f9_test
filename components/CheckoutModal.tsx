import React, { useState, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../contexts/AuthContext';

interface PricingPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice: number;
  discount: string;
  durationMonths: number;
  popular: boolean;
  theme: 'purple' | 'orange';
  features: string[];
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage?: PricingPackage | null;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, selectedPackage }) => {
  const { locale } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [activePkg, setActivePkg] = useState<PricingPackage | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<'pending' | 'completed' | 'failed' | 'manual_check'>('pending');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  // Dictionary for translations
  const dict = {
    vi: {
      title: 'NẠP CREDITS TỰ ĐỘNG',
      selectPackage: 'Chọn Gói Nạp',
      paymentDetails: 'Thông Tin Chuyển Khoản',
      starterDesc: 'Gói cơ bản',
      proDesc: 'Gói khuyên dùng',
      ultraDesc: 'Gói doanh nghiệp',
      originalPrice: 'Giá gốc',
      buyNow: 'MUA NGAY',
      payNow: 'Thanh Toán Ngay',
      bankName: 'Ngân hàng',
      accountNumber: 'Số tài khoản',
      accountHolder: 'Chủ tài khoản',
      transferAmount: 'Số tiền chuyển',
      description: 'Nội dung chuyển khoản',
      copy: 'Sao chép',
      copied: 'Đã sao chép!',
      warningInfo: 'QUAN TRỌNG: Nhập chính xác Nội dung chuyển khoản ở trên để hệ thống tự động cộng Credit trong 10 giây.',
      pollingMessage: 'Đang chờ giao dịch từ ngân hàng...',
      successTitle: 'THANH TOÁN THÀNH CÔNG!',
      successMessage: 'Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của F9 Rendering.',
      successCredits: 'Đã cộng thêm {{credits}} credits vào tài khoản của bạn.',
      close: 'Đóng',
      back: 'Quay lại',
      mockButton: 'Mô phỏng Thanh toán (Test)',
      simulationSuccess: 'Gửi yêu cầu mô phỏng thành công!',
    },
    en: {
      title: 'AUTOMATIC DEPOSIT CREDITS',
      selectPackage: 'Select Package',
      paymentDetails: 'Payment Details',
      starterDesc: 'Starter Package',
      proDesc: 'Recommended Package',
      ultraDesc: 'Enterprise Package',
      originalPrice: 'Original Price',
      buyNow: 'BUY NOW',
      payNow: 'Pay Now',
      bankName: 'Bank',
      accountNumber: 'Account Number',
      accountHolder: 'Account Holder',
      transferAmount: 'Amount',
      description: 'Transfer Description',
      copy: 'Copy',
      copied: 'Copied!',
      warningInfo: 'IMPORTANT: Enter the exact Transfer Description above so that credits can be credited automatically in 10s.',
      pollingMessage: 'Waiting for transaction from bank...',
      successTitle: 'PAYMENT SUCCESSFUL!',
      successMessage: 'Thank you for choosing F9 Rendering.',
      successCredits: 'Added {{credits}} credits to your account.',
      close: 'Close',
      back: 'Back',
      mockButton: 'Simulate Payment (Test)',
      simulationSuccess: 'Simulation request sent successfully!',
    }
  };

  const t = (key: string, variables?: Record<string, string | number>) => {
    const lang = locale === 'vi' ? 'vi' : 'en';
    let text = dict[lang][key as keyof typeof dict['vi']] || key;
    if (variables) {
      Object.keys(variables).forEach((vKey) => {
        text = text.replace(`{{${vKey}}}`, String(variables[vKey]));
      });
    }
    return text;
  };

  // 1. Fetch Packages if modal is open and no initial package is provided
  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE_URL}/api/payment/packages`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.success) {
            setPackages(resData.data);
          }
        })
        .catch((err) => console.error('Error fetching packages:', err));
    }
  }, [isOpen, API_BASE_URL]);

  // Set initial package from props if provided
  useEffect(() => {
    if (selectedPackage) {
      setActivePkg(selectedPackage);
    } else {
      setActivePkg(null);
    }
    setOrderData(null);
    setOrderStatus('pending');
  }, [selectedPackage, isOpen]);

  // 2. Generate Payment Order when active package changes (or user clicks Buy Now)
  const handleBuyPackage = async (pkg: PricingPackage) => {
    setLoadingOrder(true);
    setOrderData(null);
    setOrderStatus('pending');
    try {
      const token = localStorage.getItem('f9_token');
      const res = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      const resData = await res.json();
      if (resData.success) {
        setOrderData(resData.data);
      } else {
        alert(resData.message || 'Lỗi khi tạo đơn hàng');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ');
    } finally {
      setLoadingOrder(false);
    }
  };

  // Handle immediate purchase if modal opened with pre-selected package
  useEffect(() => {
    if (isOpen && activePkg && !orderData && !loadingOrder) {
      handleBuyPackage(activePkg);
    }
  }, [activePkg, isOpen, orderData]);

  // 3. Poll Order Status
  useEffect(() => {
    if (!orderData || orderStatus === 'completed') return;

    const token = localStorage.getItem('f9_token');
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payment/order/${orderData.orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const resData = await res.json();
        if (resData.success) {
          if (resData.status === 'completed') {
            setOrderStatus('completed');
            refreshUser(); // Refresh user credit balance in context
            clearInterval(interval);
          } else if (resData.status === 'manual_check') {
            setOrderStatus('manual_check');
            clearInterval(interval);
          } else if (resData.status === 'failed') {
            setOrderStatus('failed');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [orderData, orderStatus, refreshUser, API_BASE_URL]);

  // 4. Mock simulation for easy local validation
  const handleSimulatePayment = async () => {
    if (!orderData || simulating) return;
    setSimulating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payment/sepay-webhook?secret=f9rendering2024secret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionContent: orderData.orderCode,
          transferAmount: orderData.amount,
          gateway: 'MSB',
          accountNumber: '80003282069',
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setOrderStatus('completed');
        refreshUser();
      } else {
        alert(resData.message || 'Mô phỏng thất bại');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ webhook');
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(num)
      .replace('₫', 'đ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-bold text-lg">💰</span>
            <h2 className="text-lg font-bold text-slate-100 tracking-wider">
              {t('title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900">
          {/* Step 1: Package selection */}
          {!activePkg && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
                {t('selectPackage')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`p-5 rounded-xl border flex flex-col justify-between transition-all bg-slate-800/40 cursor-pointer ${
                      pkg.popular
                        ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                        : 'border-slate-700/60 hover:border-slate-600'
                    }`}
                    onClick={() => setActivePkg(pkg)}
                  >
                    <div>
                      {pkg.popular && (
                        <span className="inline-block bg-orange-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full mb-3 uppercase tracking-wider">
                          POPULAR
                        </span>
                      )}
                      <h4 className="text-base font-bold text-slate-100 mb-1 uppercase tracking-wider">
                        {pkg.name}
                      </h4>
                      <p className="text-lg font-extrabold text-orange-400 mb-4">
                        {pkg.credits.toLocaleString()} Cr
                      </p>
                      <div className="text-xs text-slate-400 line-through">
                        {formatVND(pkg.originalPrice)}
                      </div>
                      <div className="text-lg font-bold text-slate-200 mb-4">
                        {formatVND(pkg.price)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePkg(pkg);
                      }}
                      className="w-full py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-bold transition-all"
                    >
                      {t('buyNow')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Payment details */}
          {activePkg && (
            <div>
              {loadingOrder && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-4"></div>
                  <p className="text-slate-400 text-sm">Đang tạo đơn hàng...</p>
                </div>
              )}

              {!loadingOrder && orderData && (
                <div>
                  {orderStatus === 'completed' ? (
                    // Success View
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/40 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <span className="text-3xl text-emerald-400">✓</span>
                      </div>
                      <h3 className="text-xl font-bold text-emerald-400 mb-3 tracking-wide">
                        {t('successTitle')}
                      </h3>
                      <p className="text-slate-300 text-sm max-w-md mb-2">
                        {t('successMessage')}
                      </p>
                      <p className="text-slate-400 text-sm font-semibold mb-6">
                        {t('successCredits', { credits: orderData.credits.toLocaleString() })}
                      </p>
                      <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg transition-all"
                      >
                        {t('close')}
                      </button>
                    </div>
                  ) : (
                    // Checkout View
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Left side: VietQR Code */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
                        <img
                          src={orderData.vietQrUrl}
                          alt="VietQR code"
                          className="w-full max-w-[200px] aspect-square object-contain rounded-lg shadow-md border border-slate-700/50 bg-white p-2"
                        />
                        <div className="mt-3 text-center">
                          <p className="text-[10px] text-slate-400 max-w-[180px] leading-tight">
                            Quét mã QR bằng ứng dụng ngân hàng (Mobile Banking) để thanh toán nhanh.
                          </p>
                        </div>
                      </div>

                      {/* Right side: Bank account transfer details */}
                      <div className="md:col-span-7 space-y-4">
                        <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider">
                          {t('paymentDetails')}
                        </h4>

                        <div className="space-y-3 bg-slate-950/20 p-4 rounded-xl border border-slate-800/60">
                          {/* Bank Name */}
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">{t('bankName')}</span>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                              <span>{orderData.bankInfo.bankName}</span>
                            </div>
                          </div>

                          {/* Account Number */}
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">{t('accountNumber')}</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-200">
                              <span>{orderData.bankInfo.accountNumber}</span>
                              <button
                                onClick={() => copyToClipboard(orderData.bankInfo.accountNumber, 'acc')}
                                className="text-orange-500 hover:text-orange-400 text-[10px] underline font-normal transition-colors"
                              >
                                {copiedField === 'acc' ? t('copied') : t('copy')}
                              </button>
                            </div>
                          </div>

                          {/* Account Holder */}
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">{t('accountHolder')}</span>
                            <span className="font-semibold text-slate-200">{orderData.bankInfo.accountHolder}</span>
                          </div>

                          <div className="border-t border-slate-800/80 my-2"></div>

                          {/* Amount */}
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">{t('transferAmount')}</span>
                            <div className="flex items-center gap-1.5 font-extrabold text-orange-400 text-sm">
                              <span>{formatVND(orderData.amount)}</span>
                              <button
                                onClick={() => copyToClipboard(String(orderData.amount), 'amt')}
                                className="text-orange-500 hover:text-orange-400 text-[10px] underline font-normal transition-colors"
                              >
                                {copiedField === 'amt' ? t('copied') : t('copy')}
                              </button>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="flex justify-between items-center text-xs bg-orange-500/5 p-2 rounded-lg border border-orange-500/10">
                            <span className="text-slate-300 font-medium">{t('description')}</span>
                            <div className="flex items-center gap-1.5 font-extrabold text-orange-500 text-sm tracking-wider">
                              <span>{orderData.orderCode}</span>
                              <button
                                onClick={() => copyToClipboard(orderData.orderCode, 'code')}
                                className="text-orange-500 hover:text-orange-400 text-[10px] underline font-normal transition-colors"
                              >
                                {copiedField === 'code' ? t('copied') : t('copy')}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Polling wait status */}
                        <div className="flex items-center gap-2.5 py-1 text-slate-400 text-xs">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                          </span>
                          <span>{t('pollingMessage')}</span>
                        </div>

                        {/* Warning Box */}
                        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[10px] text-amber-300 leading-normal">
                          ⚠️ {t('warningInfo')}
                        </div>

                        {/* Simulate mock callback button */}
                        <button
                          onClick={handleSimulatePayment}
                          disabled={simulating}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700/80 transition-all flex items-center justify-center gap-2"
                        >
                          {simulating && <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-300"></div>}
                          <span>{t('mockButton')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between">
          {activePkg && !orderData && (
            <button
              onClick={() => setActivePkg(null)}
              className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-all"
            >
              {t('back')}
            </button>
          )}
          <span className="text-[10px] text-slate-500 flex items-center">
            Secured via SePay & VietQR
          </span>
        </div>
      </div>
    </div>
  );
};
