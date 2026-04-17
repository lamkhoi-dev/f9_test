import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { useLanguage } from '../hooks/useLanguage';

const languages = [
  { code: 'vi', name: 'VN Tiếng Việt' },
  { code: 'en', name: 'EN English' },
] as const;

type LanguageCode = typeof languages[number]['code'];

const LanguageSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, changeLanguage } = useLanguage();
  const switcherRef = useRef<HTMLDivElement>(null);
  
  const selectedLanguage = languages.find(lang => lang.code === locale) || languages[0];

  const handleSelect = (lang: typeof languages[number]) => {
    changeLanguage(lang.code as LanguageCode);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={switcherRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-600 transition-colors"
      >
        <span>{selectedLanguage.name}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 top-full right-0 mt-1 w-max bg-slate-700 border border-slate-600 rounded-lg shadow-lg">
          <ul className="py-1">
            {languages.map((lang) => (
              <li
                key={lang.code}
                onClick={() => handleSelect(lang)}
                className={`px-4 py-2 cursor-pointer hover:bg-slate-600 text-white text-sm ${selectedLanguage.code === lang.code ? 'font-semibold' : ''}`}
              >
                {lang.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;