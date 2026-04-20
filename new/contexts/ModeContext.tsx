
import React, { useState, ReactNode } from 'react';
import { ModeContext, useMode } from './mode-context-utils';

export type AppMode = 'free' | 'pro' | 'banana2';
export type ProResolution = '2k' | '4k';

export interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  isPro: boolean;
  proResolution: ProResolution;
  setProResolution: (res: ProResolution) => void;
  getModelName: (type: 'text' | 'image' | 'video') => string;
}

export { useMode };

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>('free');
  const [proResolution, setProResolution] = useState<ProResolution>('2k');

  const toggleMode = async () => {
    const newMode = mode === 'free' ? 'pro' : 'free';
    
    if (newMode === 'pro') {
      // Mandatory API Key check for Pro mode
      if ((window as any).aistudio) {
        try {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            if (!hasKey) {
                const success = await (window as any).aistudio.openSelectKey();
                if (!success) return; // User cancelled or failed
            }
        } catch (e) {
            console.error("Error checking API key:", e);
        }
      }
    }
    
    setMode(newMode);
  };

  const getModelName = (type: 'text' | 'image' | 'video') => {
    if (mode === 'pro') {
      switch (type) {
        case 'image': return 'gemini-3-pro-image-preview';
        case 'text': return 'gemini-3-pro-image-preview';
        case 'video': return 'gemini-3-pro-image-preview';
        default: return 'gemini-3-pro-image-preview';
      }
    } else if (mode === 'banana2') {
      switch (type) {
        case 'image': return 'gemini-3.1-flash-image-preview';
        case 'text': return 'gemini-3.1-flash-image-preview';
        case 'video': return 'gemini-3.1-flash-image-preview';
        default: return 'gemini-3.1-flash-image-preview';
      }
    } else {
      // Free / Nano Banana
      switch (type) {
        case 'image': return 'gemini-2.5-flash-image';
        case 'text': return 'gemini-2.5-flash';
        case 'video': return 'veo-3.1-fast-generate-preview'; // Fast video for Free
        default: return 'gemini-2.5-flash';
      }
    }
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode, isPro: mode === 'pro' || mode === 'banana2', proResolution, setProResolution, getModelName }}>
      {children}
    </ModeContext.Provider>
  );
};
