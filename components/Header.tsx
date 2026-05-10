
import React, { useState, useRef, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../hooks/useLanguage';
import { useSnow } from '../contexts/SnowContext';
import { useMode, UI_MODE_LABELS, AppMode } from '../contexts/ModeContext';
import { usePricing } from '../contexts/PricingContext';
import { useAuth } from '../contexts/AuthContext';
import { BoltIcon } from './icons/BoltIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { ClockIcon } from './icons/ClockIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { CpuChipIcon } from './icons/CpuChipIcon';
import AISettingsModal from './AISettingsModal';

interface HeaderProps {
  onNavigateHistory?: () => void;
  onNavigate?: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigateHistory, onNavigate }) => {
  const { t } = useLanguage();
  const { isSnowing, toggleSnow } = useSnow();
  const { mode, setMode, proResolution, setProResolution, getPriceKey } = useMode();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { getPrice } = usePricing();
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [isPersonalAI, setIsPersonalAI] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const checkPersonalAI = () => {
    const saved = localStorage.getItem('f9_user_api_config');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setIsPersonalAI(!!settings.usePersonalKey);
      } catch (e) {
        setIsPersonalAI(false);
      }
    } else {
      setIsPersonalAI(false);
    }
  };

  useEffect(() => {
    checkPersonalAI();
    window.addEventListener('f9_settings_updated', checkPersonalAI);
    return () => window.removeEventListener('f9_settings_updated', checkPersonalAI);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMode = async (type: 'free' | 'pro-1k' | 'pro-2k' | 'pro-4k' | 'banana2-1k' | 'banana2-2k' | 'banana2-4k') => {
    if (type === 'free') {
      setMode('free');
    } else {
      const resMap: Record<string, '1k' | '2k' | '4k'> = {
        'pro-1k': '1k', 'pro-2k': '2k', 'pro-4k': '4k',
        'banana2-1k': '1k', 'banana2-2k': '2k', 'banana2-4k': '4k',
      };
      if (type.startsWith('banana2')) {
        setMode('banana2');
      } else {
        setMode('pro');
      }
      setProResolution(resMap[type]);
    }
    setIsModeDropdownOpen(false);
  };

  const getCurrentLabel = () => {
    if (mode === 'free') return `${UI_MODE_LABELS.free} (1K)`;
    const label = mode === 'banana2' ? UI_MODE_LABELS.banana2 : UI_MODE_LABELS.pro;
    return `${label} (${proResolution.toUpperCase()})`;
  };

  const renderPriceLabel = (m: AppMode, res: string) => {
    if (isPersonalAI) return null;
    const priceKey = getPriceKey(m, res as any);
    const price = getPrice(priceKey);
    if (price === null) return null;
    return (
      <span className="ml-auto text-[10px] font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded leading-none">
        {price} credits
      </span>
    );
  };

  return (
    <>
    <header className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-700/50 shadow-lg transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                <span className="font-bold text-white text-sm">F9</span>
             </div>
             <h1 className="text-xl font-bold text-slate-100 tracking-wide font-architecture">
              {t('header.home')}
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Mode Selector */}
            <div className="relative" ref={modeDropdownRef}>
                <button
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-300 min-w-[140px] justify-between ${
                    mode === 'pro' || mode === 'banana2'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-lg shadow-purple-500/30'
                      : 'bg-slate-800 text-yellow-400 border-yellow-500/30 hover:bg-slate-700'
                  }`}
                  title={t('header.selectRenderMode')}
                >
                  <div className="flex items-center gap-2">
                      {mode === 'pro' || mode === 'banana2' ? <SparklesIcon className="w-4 h-4 animate-pulse" /> : <BoltIcon className="w-4 h-4" />}
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {getCurrentLabel()}
                      </span>
                  </div>
                  <ChevronDownIcon className={`w-3 h-3 transition-transform ${isModeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isModeDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#1e293b] border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-[60] animate-fade-in max-h-80 overflow-y-auto custom-scrollbar">
                        <div className="p-1">
                            <button 
                                onClick={() => handleSelectMode('free')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'free' ? 'bg-slate-700 text-yellow-400' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <BoltIcon className="w-4 h-4" />
                                <span>{UI_MODE_LABELS.free} (1K)</span>
                                {renderPriceLabel('free', '1k')}
                            </button>
                            <div className="my-1 border-t border-slate-700/50"></div>
                            <p className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Banana Pro</p>
                            <button 
                                onClick={() => handleSelectMode('pro-1k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'pro' && proResolution === '1k' ? 'bg-green-600/20 text-green-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>{UI_MODE_LABELS.pro} (1K)</span>
                                {renderPriceLabel('pro', '1k')}
                            </button>
                            <button 
                                onClick={() => handleSelectMode('pro-2k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'pro' && proResolution === '2k' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>{UI_MODE_LABELS.pro} (2K)</span>
                                {renderPriceLabel('pro', '2k')}
                            </button>
                            <button 
                                onClick={() => handleSelectMode('pro-4k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'pro' && proResolution === '4k' ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4 text-purple-400" />
                                <span>{UI_MODE_LABELS.pro} (4K)</span>
                                {renderPriceLabel('pro', '4k')}
                            </button>
                            <div className="my-1 border-t border-slate-700/50"></div>
                            <p className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Banana 2</p>
                            <button 
                                onClick={() => handleSelectMode('banana2-1k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'banana2' && proResolution === '1k' ? 'bg-green-600/20 text-green-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>{UI_MODE_LABELS.banana2} (1K)</span>
                                {renderPriceLabel('banana2', '1k')}
                            </button>
                            <button 
                                onClick={() => handleSelectMode('banana2-2k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'banana2' && proResolution === '2k' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>{UI_MODE_LABELS.banana2} (2K)</span>
                                {renderPriceLabel('banana2', '2k')}
                            </button>
                            <button 
                                onClick={() => handleSelectMode('banana2-4k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'banana2' && proResolution === '4k' ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4 text-purple-400" />
                                <span>{UI_MODE_LABELS.banana2} (4K)</span>
                                {renderPriceLabel('banana2', '4k')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button
              onClick={toggleSnow}
              title={isSnowing ? t('header.turnOffSnow') : t('header.turnOnSnow')}
              className={`p-2 rounded-lg transition-colors flex items-center justify-center border ${
                isSnowing 
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <span className="text-lg leading-none">❄️</span>
            </button>

            {/* AI Config Shortcut */}
            <button
              onClick={() => setIsAISettingsOpen(true)}
              title="Cấu hình AI cá nhân"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 border ${
                isPersonalAI 
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/40 shadow-lg shadow-orange-500/10' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <CpuChipIcon className={`${isPersonalAI ? 'w-5 h-5 animate-pulse' : 'w-5 h-5'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                {isPersonalAI ? 'Personal Key' : 'AI Config'}
              </span>
            </button>

            <LanguageSwitcher />

            {/* User Profile Dropdown */}
            {isAuthenticated ? (
              <div 
                className="relative" 
                ref={userDropdownRef}
                onMouseEnter={() => setIsUserDropdownOpen(true)}
                onMouseLeave={() => setIsUserDropdownOpen(false)}
              >
                <button
                  className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-slate-700 transition-all shadow-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[11px] font-bold text-white max-w-[80px] truncate">{user?.name}</span>
                    {!isPersonalAI && (
                      <span className="text-[10px] text-yellow-400 font-medium">{user?.freeUsageLeft} lượt</span>
                    )}
                  </div>
                  <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-56 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[60] animate-fade-in group">
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={() => {
                          onNavigateHistory?.();
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <ClockIcon className="w-4 h-4" />
                        <span>Lịch sử (History)</span>
                      </button>

                      <a 
                        href="https://www.youtube.com/watch?v=WHPcQle0O5s"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <VideoCameraIcon className="w-4 h-4" />
                        <span>Hướng dẫn lấy API Key</span>
                      </a>

                      <button
                        onClick={() => {
                          setIsAISettingsOpen(true);
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/10 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <CpuChipIcon className="w-4 h-4" />
                        <span>Cấu hình AI Cá nhân</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            onNavigate?.('admin');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-purple-400 hover:bg-purple-500/10 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                          <span>Trang quản trị (Admin)</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-slate-700/50"></div>

                      <button
                        onClick={() => {
                          logout();
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Guest: show History + Tutorial + Login */}
                <button
                  onClick={onNavigateHistory}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-lg transform hover:scale-105"
                >
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span>Lịch sử ( History) </span>
                </button>
                <a 
                  href="https://www.youtube.com/watch?v=WHPcQle0O5s"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-lg shadow-red-900/20 transform hover:scale-105"
                >
                  <VideoCameraIcon className="w-3.5 h-3.5" />
                  <span>{t('Hướng dẫn lấy API Key')}</span>
                </a>
                <button
                  onClick={() => onNavigate?.('login')}
                  className="px-4 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-lg shadow-orange-500/20"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
    <AISettingsModal 
      isOpen={isAISettingsOpen} 
      onClose={() => setIsAISettingsOpen(false)} 
    />
    </>
  );
};

export default Header;
