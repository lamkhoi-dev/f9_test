
import React from 'react';
import { useLanguage } from '../hooks/useLanguage';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-[#0b1120] text-center py-6 border-t border-slate-800/50 mt-auto">
      <div className="container mx-auto px-4">
        <p className="text-sm text-slate-400 font-medium">
          {t('footer.copyright')}
        </p>
        <p className="text-xs text-slate-500 mt-1">
            Professional AI Rendering Solutions
        </p>
      </div>
    </footer>
  );
};

export default Footer;
