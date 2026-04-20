
import React from 'react';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { RectangleGroupIcon } from './icons/RectangleGroupIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { useLanguage } from '../hooks/useLanguage';

const Banner: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 group">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
        style={{ 
            backgroundImage: "url('https://hoanghamobile.com/tin-tuc/wp-content/uploads/2024/07/anh-hoa-dao.jpg')",
        }}
      ></div>
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/90 to-transparent"></div>
      
      {/* Content */}
      <div className="relative z-10 p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-start h-full max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 backdrop-blur-md mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">AI Architecture V3.0</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight font-architecture drop-shadow-lg mb-4">
          {t('banner.title')}
        </h1>
        
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl font-light mb-8 border-l-4 border-orange-500 pl-4">
          {t('banner.subtitle')}
        </p>
        
        <div className="flex flex-wrap gap-4">
          <a 
            href="https://3dmili.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group/btn flex items-center justify-center space-x-2 bg-white text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-orange-500 hover:text-white transition-all duration-300 shadow-lg hover:shadow-orange-500/25"
          >
            <GlobeAltIcon className="w-5 h-5 transition-transform group-hover/btn:rotate-12" />
            <span>{t('banner.websiteBtn')}</span>
          </a>
          
          <button className="flex items-center justify-center space-x-2 bg-slate-800/50 backdrop-blur-md text-white font-semibold px-6 py-3 rounded-xl border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300">
            <RectangleGroupIcon className="w-5 h-5" />
            <span>{t('banner.pageBtn')}</span>
          </button>
          
          <a 
            href="https://shop3dmili.com/apps-render-with-ai-auto-prompt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 bg-slate-800/50 backdrop-blur-md text-white font-semibold px-6 py-3 rounded-xl border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-all duration-300"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>{t('banner.downloadBtn')}</span>
          </a>
        </div>
      </div>

      {/* Decorative Blur Element */}
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
    </section>
  );
};

export default Banner;
