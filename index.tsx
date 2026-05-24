import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { SnowProvider } from './contexts/SnowContext';
import { ModeProvider } from './contexts/ModeContext';
import { ApiKeyProvider } from './contexts/ApiKeyContext';
import ApiKeyModal from './components/ApiKeyModal';
import ModelNotEnabledModal from './components/ModelNotEnabledModal';

interface ModelNotEnabledInfo {
  modelName: string;
  setupUrl: string;
  instructions: string[];
}

const GlobalModals: React.FC = () => {
  const [modelNotEnabled, setModelNotEnabled] = useState<ModelNotEnabledInfo | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as ModelNotEnabledInfo;
      setModelNotEnabled(detail);
    };
    window.addEventListener('model_not_enabled', handler);
    return () => window.removeEventListener('model_not_enabled', handler);
  }, []);

  return modelNotEnabled ? (
    <ModelNotEnabledModal
      modelName={modelNotEnabled.modelName}
      setupUrl={modelNotEnabled.setupUrl}
      instructions={modelNotEnabled.instructions}
      onClose={() => setModelNotEnabled(null)}
    />
  ) : null;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <SnowProvider>
        <ApiKeyProvider>
          <ModeProvider>
            <App />
            <ApiKeyModal />
            <GlobalModals />
          </ModeProvider>
        </ApiKeyProvider>
      </SnowProvider>
    </LanguageProvider>
  </React.StrictMode>
);