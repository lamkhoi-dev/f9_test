import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

const REMEMBER_KEY = 'f9_remember';

const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Restore remembered credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      try {
        const { phone: savedPhone, password: savedPass } = JSON.parse(saved);
        setPhone(savedPhone || '');
        setPassword(savedPass || '');
        setRememberMe(true);
      } catch {}
    }
  }, []);

  const validatePhone = (value: string): string => {
    if (!value) return '';
    if (value.length < 10) return 'SĐT phải có ít nhất 10 số';
    if (value.length > 11) return 'SĐT không quá 11 số';
    if (!/^0\d{9,10}$/.test(value)) return 'SĐT phải bắt đầu bằng số 0';
    return '';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9]/g, '');
    setPhone(cleaned);
    if (cleaned.length >= 10 || cleaned.length === 0) {
      setPhoneError(validatePhone(cleaned));
    } else if (cleaned.length > 0) {
      setPhoneError('');
    }
  };

  const handlePhoneBlur = () => {
    if (phone) setPhoneError(validatePhone(phone));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneValidation = validatePhone(phone);
    if (phoneValidation) {
      setPhoneError(phoneValidation);
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await login(phone, password);

      // Save or clear remember me
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ phone, password }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      onNavigate('home');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const isPhoneValid = phone.length >= 10 && !validatePhone(phone);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wider">3DMILI.ORG</h1>
          <p className="text-gray-400 mt-2">AI Studio — Auto Rendering Platform</p>
        </div>

        <div className="bg-[#1e293b] border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Đăng nhập</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-phone" className="block text-sm font-medium text-gray-300 mb-1.5">Số điện thoại</label>
              <div className="relative">
                <input
                  id="login-phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  required
                  maxLength={11}
                  className={`w-full bg-[#0f172a] border text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 transition-colors ${
                    phoneError
                      ? 'border-red-500 focus:ring-red-500'
                      : isPhoneValid
                      ? 'border-green-500/50 focus:ring-green-500'
                      : 'border-gray-600 focus:ring-orange-500'
                  }`}
                  placeholder="Số điện thoại"
                />
                {isPhoneValid && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">✓</span>
                )}
              </div>
              {phoneError && (
                <p className="mt-1 text-xs text-red-400">{phoneError}</p>
              )}
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
              />
            </div>

            {/* Remember me */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-[#0f172a] text-orange-500 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-gray-400">Nhớ mật khẩu</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg text-lg transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-400 text-sm">Chưa có tài khoản? </span>
            <button
              onClick={() => onNavigate('signup')}
              className="text-orange-400 hover:text-orange-300 text-sm font-semibold"
            >
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
