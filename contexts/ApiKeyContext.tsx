import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'f9_user_api_key';

interface ApiKeyContextType {
  apiKey: string | null;
  isKeySet: boolean;
  isKeyModalOpen: boolean;
  isValidating: boolean;
  setApiKey: (key: string) => Promise<boolean>;
  clearApiKey: () => void;
  showKeyModal: () => void;
  hideKeyModal: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const useApiKey = () => {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error('useApiKey must be used within ApiKeyProvider');
  return ctx;
};

export const ApiKeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const isKeySet = apiKey !== null && apiKey.length > 0;

  const setApiKey = useCallback(async (key: string): Promise<boolean> => {
    setIsValidating(true);
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      });

      if (!res.ok) {
        return false;
      }

      localStorage.setItem(STORAGE_KEY, key);
      setApiKeyState(key);
      setIsKeyModalOpen(false);
      return true;
    } catch {
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyState(null);
  }, []);

  const showKeyModal = useCallback(() => setIsKeyModalOpen(true), []);
  const hideKeyModal = useCallback(() => setIsKeyModalOpen(false), []);

  return (
    <ApiKeyContext.Provider value={{
      apiKey, isKeySet, isKeyModalOpen, isValidating,
      setApiKey, clearApiKey, showKeyModal, hideKeyModal,
    }}>
      {children}
    </ApiKeyContext.Provider>
  );
};
