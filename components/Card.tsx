
import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface CardProps {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  onClick?: () => void;
  isClickable?: boolean;
}

const Card: React.FC<CardProps> = ({ icon, titleKey, descriptionKey, onClick, isClickable }) => {
  const { t } = useLanguage();

  const cardClasses = [
    "group",
    "relative",
    "bg-[#1e293b]",
    "border",
    "border-slate-700/50",
    "rounded-2xl",
    "p-6",
    "flex",
    "flex-col",
    "transition-all",
    "duration-300",
    "overflow-hidden",
    isClickable ? "cursor-pointer hover:-translate-y-2 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10" : "opacity-80"
  ].join(" ");

  return (
    <div className={cardClasses} onClick={isClickable ? onClick : undefined}>
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10 flex justify-between items-start mb-6">
        <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 group-hover:scale-110 group-hover:bg-slate-700 transition-all duration-300 shadow-inner">
          {icon}
        </div>
        
        <span className="bg-slate-800 text-orange-400 border border-slate-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider group-hover:bg-orange-500 group-hover:text-white transition-colors">
          {t('cards.allAi')}
        </span>
      </div>
      
      <div className="relative z-10 flex-grow">
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors font-architecture">
            {t(titleKey)}
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 group-hover:text-slate-300">
            {t(descriptionKey)}
        </p>
      </div>

      {isClickable && (
        <div className="relative z-10 mt-6 pt-4 border-t border-slate-700/50 flex items-center text-sm font-medium text-slate-500 group-hover:text-white transition-colors">
            <span>{t('Truy cập ngay')}</span>
            <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
        </div>
      )}
    </div>
  );
};

export default Card;
