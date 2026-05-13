
import React, { useState, ReactNode } from 'react';
import { ModeContext, useMode } from './mode-context-utils';

export type AppMode = 'pro' | 'banana2';
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
  PRO_1K: 'pro-1k',
  PRO_2K: 'pro-2k',
  PRO_4K: 'pro-4k',
  BANANA2_1K: 'banana2-1k',
  BANANA2_2K: 'banana2-2k',
  BANANA2_4K: 'banana2-4k',
};

export const UI_MODE_MODELS: Record<AppMode, string> = {
  'pro': 'gemini-3-pro-image-preview',
  'banana2': 'gemini-3.1-flash-image-preview'
};

export const UI_MODE_LABELS: Record<AppMode, string> = {
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

// Credit costs per resolution
export const CREDIT_COSTS: Record<ProResolution, number> = {
  '1k': 10,
  '2k': 20,
  '4k': 40,
};

export { useMode };

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>('pro');
  const [proResolution, setProResolution] = useState<ProResolution>('1k');

  const toggleMode = () => {
    const newMode = mode === 'pro' ? 'banana2' : 'pro';
    setMode(newMode);
  };

  const getModelName = (type: 'text' | 'image' | 'video', customMode?: AppMode) => {
    const activeMode = customMode || mode;
    
    if (activeMode === 'banana2') {
      return UI_MODE_MODELS.banana2;
    }
    // Default: Banana Pro
    switch (type) {
      case 'image': return UI_MODE_MODELS.pro;
      case 'text': return 'gemini-2.5-flash';
      case 'video': return 'veo-3.1-fast-generate-preview';
      default: return 'gemini-2.5-flash';
    }
  };

  const getPriceKey = (customMode?: AppMode, customRes?: ProResolution) => {
    const m = customMode || mode;
    const r = customRes || proResolution;
    return `${m}-${r}`;
  };

  return (
    <ModeContext.Provider value={{ 
      mode, setMode, toggleMode, 
      isPro: true, // always true now (no free mode)
      proResolution, setProResolution, 
      getModelName, 
      getPriceKey 
    }}>
      {children}
    </ModeContext.Provider>
  );
};
