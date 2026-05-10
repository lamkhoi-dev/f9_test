
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../lib/apiClient';

interface PricingItem {
  id: number;
  model: string;
  resolution: string;
  service: string;
  price: number;
}

interface PricingContextType {
  pricing: PricingItem[];
  isLoading: boolean;
  refreshPricing: () => Promise<void>;
  getPrice: (priceKey: string, service?: string) => number | null;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPricing = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/pricing');
      if (res.data.success) {
        setPricing(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const getPrice = (priceKey: string, service: string = 'all') => {
    // 1. Try exact match [priceKey, service]
    let item = pricing.find(p => p.model === priceKey && p.service === service);
    
    // 2. Fallback to 'all' service for same priceKey
    if (!item && service !== 'all') {
      item = pricing.find(p => p.model === priceKey && p.service === 'all');
    }
    
    // 3. Fallback: just match priceKey regardless of service
    if (!item) {
      item = pricing.find(p => p.model === priceKey);
    }
    
    return item ? item.price : null;
  };

  return (
    <PricingContext.Provider value={{ pricing, isLoading, refreshPricing: fetchPricing, getPrice }}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
};
