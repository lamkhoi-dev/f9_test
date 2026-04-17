import React, { useState } from 'react';
import { useApiKey } from '../contexts/ApiKeyContext';
import { useLanguage } from '../hooks/useLanguage';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';

const ApiKeyModal: React.FC = () => {
  const { isKeyModalOpen, hideKeyModal, setApiKey, clearApiKey, isKeySet, isValidating, apiKey } = useApiKey();
  const { locale } = useLanguage();
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isKeyModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = inputKey.trim();
    if (!trimmed) {
      setError(locale === 'vi' ? 'Vui lòng nhập API Key.' : 'Please enter an API Key.');
      return;
    }

    const ok = await setApiKey(trimmed);
    if (ok) {
      setSuccess(true);
      setInputKey('');
      setTimeout(() => { setSuccess(false); }, 1500);
    } else {
      setError(locale === 'vi' ? 'API Key không hợp lệ. Vui lòng kiểm tra lại.' : 'Invalid API Key. Please check and try again.');
    }
  };

  const handleClear = () => {
    clearApiKey();
    setInputKey('');
    setError(null);
    setSuccess(false);
  };

  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}${'•'.repeat(20)}${apiKey.slice(-4)}` : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={hideKeyModal} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#1e293b]/95 backdrop-blur-xl border border-slate-600/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {locale === 'vi' ? 'Cài đặt API Key' : 'API Key Settings'}
              </h2>
              <p className="text-[11px] text-slate-400">Google AI Studio / Vertex AI</p>
            </div>
          </div>
          <button onClick={hideKeyModal} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Current Status */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${
            isKeySet 
              ? 'bg-emerald-500/10 border-emerald-500/30' 
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isKeySet ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isKeySet ? 'text-emerald-300' : 'text-amber-300'}`}>
                {isKeySet 
                  ? (locale === 'vi' ? 'Key đã kích hoạt' : 'Key activated') 
                  : (locale === 'vi' ? 'Chưa có API Key' : 'No API Key')}
              </p>
              {isKeySet && (
                <p className="text-[11px] text-slate-400 font-mono truncate">{maskedKey}</p>
              )}
            </div>
            {isKeySet && (
              <button 
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all"
              >
                {locale === 'vi' ? 'Xóa Key' : 'Remove'}
              </button>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {locale === 'vi' ? 'Nhập API Key mới' : 'Enter new API Key'}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => { setInputKey(e.target.value); setError(null); }}
                  placeholder="AIza..."
                  className="w-full bg-[#0f172a] border border-slate-600/50 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none font-mono transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium">
                ✅ {locale === 'vi' ? 'API Key đã được lưu thành công!' : 'API Key saved successfully!'}
              </div>
            )}

            <button
              type="submit"
              disabled={isValidating || !inputKey.trim()}
              className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                isValidating || !inputKey.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-500 hover:to-red-500 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  <span>{locale === 'vi' ? 'Đang kiểm tra...' : 'Validating...'}</span>
                </>
              ) : (
                <span>{locale === 'vi' ? 'Xác nhận & Lưu Key' : 'Confirm & Save Key'}</span>
              )}
            </button>
          </form>

          {/* Help Link */}
          <div className="text-center pt-2 border-t border-slate-700/50">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              {locale === 'vi' ? '🔗 Hướng dẫn lấy API Key từ Google AI Studio' : '🔗 Get your API Key from Google AI Studio'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
