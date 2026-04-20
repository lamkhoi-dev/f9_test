import { createContext, useContext } from 'react';

export interface SnowContextType {
  isSnowing: boolean;
  toggleSnow: () => void;
}

export const SnowContext = createContext<SnowContextType | undefined>(undefined);

export const useSnow = () => {
  const context = useContext(SnowContext);
  if (!context) {
    throw new Error('useSnow must be used within a a SnowProvider');
  }
  return context;
};
