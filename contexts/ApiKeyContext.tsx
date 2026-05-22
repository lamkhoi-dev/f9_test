import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';

/**
 * Context for managing personal Google Cloud Service Account JSON credentials.
 * If not set, the backend will automatically fallback to system credentials.
 */
interface ApiKeyContextType {
  apiKey: string | null; // This will store the JSON string if valid
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
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('f9_gcp_credentials');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.project_id && parsed.client_email && parsed.private_key) {
          setApiKeyState(stored);
        } else {
          localStorage.removeItem('f9_gcp_credentials');
        }
      } catch (e) {
        localStorage.removeItem('f9_gcp_credentials');
      }
    }
  }, []);

  const setApiKey = async (key: string): Promise<boolean> => {
    setIsValidating(true);
    try {
      const parsed = JSON.parse(key);
      if (parsed.type === 'service_account' && parsed.project_id && parsed.client_email && parsed.private_key) {
        localStorage.setItem('f9_gcp_credentials', key);
        setApiKeyState(key);
        setIsValidating(false);
        return true;
      }
    } catch (e) {
      // JSON parse error or invalid format
    }
    setIsValidating(false);
    return false;
  };

  const clearApiKey = () => {
    localStorage.removeItem('f9_gcp_credentials');
    setApiKeyState(null);
  };

  const showKeyModal = () => setIsKeyModalOpen(true);
  const hideKeyModal = () => setIsKeyModalOpen(false);

  // isKeySet is always true because the system has a fallback key.
  // This ensures generation UI is not blocked for free users without a personal key.
  const isKeySet = true;

  return (
    <ApiKeyContext.Provider value={{
      apiKey,
      isKeySet,
      isKeyModalOpen,
      isValidating,
      setApiKey,
      clearApiKey,
      showKeyModal,
      hideKeyModal,
    }}>
      {children}
    </ApiKeyContext.Provider>
  );
};
