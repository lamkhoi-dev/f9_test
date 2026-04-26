import React, { createContext, useContext, ReactNode } from 'react';

/**
 * Stub context — API Key is no longer needed.
 * Backend authenticates via Vertex AI Service Account.
 * Kept as a thin wrapper so existing imports don't break.
 */
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
  // Always "set" — no key needed, Vertex AI handles auth server-side
  return (
    <ApiKeyContext.Provider value={{
      apiKey: 'vertex-ai',
      isKeySet: true,
      isKeyModalOpen: false,
      isValidating: false,
      setApiKey: async () => true,
      clearApiKey: () => {},
      showKeyModal: () => {},
      hideKeyModal: () => {},
    }}>
      {children}
    </ApiKeyContext.Provider>
  );
};
