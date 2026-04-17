import { createContext, useContext } from 'react';

type LanguageCode = 'vi' | 'en';

export interface LanguageContextType {
  locale: LanguageCode;
  changeLanguage: (locale: LanguageCode) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
