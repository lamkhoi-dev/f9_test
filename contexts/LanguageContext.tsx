import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import viTranslations from '../locales/vi.json';
import enTranslations from '../locales/en.json';

type LanguageCode = 'vi' | 'en';

interface LanguageContextType {
  locale: LanguageCode;
  changeLanguage: (locale: LanguageCode) => void;
  // FIX: Updated t function signature to accept an optional options object for interpolation.
  t: (key: string, options?: { [key: string]: string | number }) => any;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

// Helper function to get nested properties from an object
const getNestedTranslation = (obj: any, key: string): any => {
  return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [locale, setLocale] = useState<LanguageCode>('vi');
  const [translations, setTranslations] = useState<any>(viTranslations);

  useEffect(() => {
    if (locale === 'vi') {
      setTranslations(viTranslations);
    } else if (locale === 'en') {
      setTranslations(enTranslations);
    } else {
      setTranslations(enTranslations);
    }

    // Set document direction to LTR
    document.documentElement.dir = 'ltr';

  }, [locale]);

  const changeLanguage = (newLocale: LanguageCode) => {
    setLocale(newLocale);
  };

  // FIX: Updated t function to handle string interpolation for dynamic values in translations.
  const t = useCallback((key: string, options?: { [key: string]: string | number }): any => {
    let translation = getNestedTranslation(translations, key);
    if (translation === undefined) {
      return key;
    }

    if (typeof translation === 'string' && options) {
      Object.keys(options).forEach(optKey => {
        const regex = new RegExp(`{{${optKey}}}`, 'g');
        translation = translation.replace(regex, String(options[optKey]));
      });
    }
    
    return translation;
  }, [translations]);

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};