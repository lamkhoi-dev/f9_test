
import React, { useState, ReactNode } from 'react';
import { ModeContext, useMode } from './mode-context-utils';

export type AppMode = 'free' | 'pro' | 'banana2';
export type ProResolution = '1k' | '2k' | '4k';

export interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  isPro: boolean;
  proResolution: ProResolution;
  setProResolution: (res: ProResolution) => void;
  getModelName: (type: 'text' | 'image' | 'video', customMode?: AppMode) => string;
  getPriceKey: (customMode?: AppMode, customRes?: ProResolution) => string;
}

export const UI_PRICE_KEYS = {
  BASIC_1K: 'basic-1k',
  PRO_2K: 'pro-2k',
  PRO_4K: 'pro-4k',
  BANANA2_2K: 'banana2-2k',
  BANANA2_4K: 'banana2-4k',
};

export const UI_MODE_MODELS: Record<AppMode, string> = {
  'free': 'gemini-2.5-flash-image',
  'pro': 'gemini-3-pro-image-preview',
  'banana2': 'gemini-3.1-flash-image-preview'
};

export const UI_MODE_LABELS: Record<AppMode, string> = {
  'free': 'Basic Ver 2.5',
  'pro': 'Banana Pro',
  'banana2': 'Banana 2'
};

export const SERVICE_KEYS = {
  REALISTIC: 'realistic',
  AUTO_COLOR: 'auto-coloring',
  SKETCH: '3d-sketch',
  MATERIAL: 'material',
  STYLE: 'style',
  IMPROVE: 'improve',
  SUGGESTIONS: 'suggestions',
  MOODBOARD: 'moodboard',
  EXTRACT: 'extract',
  MERGE: 'merge',
  CLEAN: 'clean',
  STORYBOARD: 'storyboard',
  CHARACTER: 'character',
  VIRTUAL360: 'virtual360',
  ANNOTATE: 'annotate',
  SYNCCONTEXT: 'synccontext',
  ALL: 'all'
};

export const SERVICE_LABELS: Record<string, string> = {
  [SERVICE_KEYS.REALISTIC]: 'Render Kiến trúc/Nội thất',
  [SERVICE_KEYS.AUTO_COLOR]: 'Tô màu bản vẽ',
  [SERVICE_KEYS.SKETCH]: '3D thành Ảnh vẽ tay',
  [SERVICE_KEYS.MATERIAL]: 'Thay đổi vật liệu',
  [SERVICE_KEYS.STYLE]: 'Thay đổi phong cách',
  [SERVICE_KEYS.IMPROVE]: 'Nâng cấp chất lượng',
  [SERVICE_KEYS.MERGE]: 'Ghép công trình',
  [SERVICE_KEYS.CLEAN]: 'Làm sạch khu đất',
  [SERVICE_KEYS.STORYBOARD]: 'Tạo Storyboard',
  [SERVICE_KEYS.CHARACTER]: 'Đồng bộ nhân vật',
  [SERVICE_KEYS.VIRTUAL360]: 'Tham quan ảo 360',
  [SERVICE_KEYS.ANNOTATE]: 'Tạo chú thích',
  [SERVICE_KEYS.SYNCCONTEXT]: 'Đồng bộ bao cảnh',
  [SERVICE_KEYS.ALL]: 'Tất cả dịch vụ'
};

export { useMode };

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>('free');
  const [proResolution, setProResolution] = useState<ProResolution>('2k');

  const toggleMode = () => {
    const newMode = mode === 'free' ? 'pro' : 'free';
    setMode(newMode);
  };

  const getModelName = (type: 'text' | 'image' | 'video', customMode?: AppMode) => {
    const activeMode = customMode || mode;
    
    if (activeMode === 'pro') {
      return UI_MODE_MODELS.pro;
    } else if (activeMode === 'banana2') {
      return UI_MODE_MODELS.banana2;
    } else {
      // Free / Nano Banana
      switch (type) {
        case 'image': return 'gemini-2.5-flash-image';
        case 'text': return 'gemini-2.5-flash';
        case 'video': return 'veo-3.1-fast-generate-preview';
        default: return 'gemini-2.5-flash';
      }
    }
  };

  const getPriceKey = (customMode?: AppMode, customRes?: ProResolution) => {
    const m = customMode || mode;
    const r = customRes || (m === 'free' ? '1k' as ProResolution : proResolution);
    
    if (m === 'free') return UI_PRICE_KEYS.BASIC_1K;
    if (m === 'pro') return r === '4k' ? UI_PRICE_KEYS.PRO_4K : UI_PRICE_KEYS.PRO_2K;
    if (m === 'banana2') return r === '4k' ? UI_PRICE_KEYS.BANANA2_4K : UI_PRICE_KEYS.BANANA2_2K;
    return `${m}-${r}`;
  };

  return (
    <ModeContext.Provider value={{ 
      mode, setMode, toggleMode, 
      isPro: mode === 'pro' || mode === 'banana2', 
      proResolution, setProResolution, 
      getModelName, 
      getPriceKey 
    }}>
      {children}
    </ModeContext.Provider>
  );
};
