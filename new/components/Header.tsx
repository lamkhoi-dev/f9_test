
import React, { useState, useRef, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../hooks/useLanguage';
import { useSnow } from '../contexts/SnowContext';
import { useMode } from '../contexts/ModeContext';
import { BoltIcon } from './icons/BoltIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { ClockIcon } from './icons/ClockIcon';

interface HeaderProps {
  onNavigateHistory?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigateHistory }) => {
  const { t } = useLanguage();
  const { isSnowing, toggleSnow } = useSnow();
  const { mode, setMode, proResolution, setProResolution } = useMode();
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMode = async (type: 'free' | 'pro-2k' | 'pro-4k' | 'banana2-2k' | 'banana2-4k') => {
    if (type === 'free') {
      setMode('free');
    } else {
      if ((window as any).aistudio) {
        try {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
            const success = await (window as any).aistudio.openSelectKey();
            if (!success) return; 
          }
        } catch (e) {
          console.error("Error checking API key:", e);
        }
      }
      if (type.startsWith('banana2')) {
        setMode('banana2');
        setProResolution(type === 'banana2-4k' ? '4k' : '2k');
      } else {
        setMode('pro');
        setProResolution(type === 'pro-4k' ? '4k' : '2k');
      }
    }
    setIsModeDropdownOpen(false);
  };

  const getCurrentLabel = () => {
    if (mode === 'free') return 'Basic Ver 2.5 (1K)';
    if (mode === 'banana2') return `Banana 2 (${proResolution.toUpperCase()})`;
    return `Banana Pro (${proResolution.toUpperCase()})`;
  };

  return (
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
            {/* Nút Lịch sử style Emerald */}
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
                    <div className="absolute top-full right-0 mt-2 w-48 bg-[#1e293b] border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-[60] animate-fade-in">
                        <div className="p-1">
                            <button 
                                onClick={() => handleSelectMode('free')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'free' ? 'bg-slate-700 text-yellow-400' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <BoltIcon className="w-4 h-4" />
                                <span>Basic Ver 2.5 (1K)</span>
                            </button>
                            <div className="my-1 border-t border-slate-700/50"></div>
                            <button 
                                onClick={() => handleSelectMode('pro-2k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'pro' && proResolution === '2k' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>Banana Pro (2K)</span>
                            </button>
                            <button 
                                onClick={() => handleSelectMode('pro-4k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'pro' && proResolution === '4k' ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4 text-purple-400" />
                                <span>Banana Pro (4K)</span>
                            </button>
                            <button 
                                onClick={() => handleSelectMode('banana2-2k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'banana2' && proResolution === '2k' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>Banana 2 (2K)</span>
                            </button>
                            <button 
                                onClick={() => handleSelectMode('banana2-4k')}
                                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${mode === 'banana2' && proResolution === '4k' ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <SparklesIcon className="w-4 h-4 text-purple-400" />
                                <span>Banana 2 (4K)</span>
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
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
