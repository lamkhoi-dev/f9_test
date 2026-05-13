import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';
import aiService from '../services/aiService';

interface User {
  id: string;
  phone: string;
  name: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro';
  hasPersonalKey: boolean;
  freeUsageLeft: number;
  balance: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isFreePlan: boolean;
  isProPlan: boolean;
  hasPersonalKey: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  signup: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('f9_token');
    const savedUser = localStorage.getItem('f9_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('f9_token');
        localStorage.removeItem('f9_user');
      }
    }
    setIsLoading(false);
  }, []);

  const saveAuth = (userData: User, tokenStr: string) => {
    setUser(userData);
    setToken(tokenStr);
    localStorage.setItem('f9_token', tokenStr);
    localStorage.setItem('f9_user', JSON.stringify(userData));
  };

  const login = useCallback(async (phone: string, password: string) => {
    const res = await apiClient.post('/auth/login', { phone, password });
    const { user: userData, token: tokenStr } = res.data.data;
    saveAuth(userData, tokenStr);
  }, []);

  const signup = useCallback(async (name: string, phone: string, password: string) => {
    const res = await apiClient.post('/auth/signup', { name, phone, password });
    const { user: userData, token: tokenStr } = res.data.data;
    saveAuth(userData, tokenStr);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('f9_token');
    localStorage.removeItem('f9_user');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const userData = res.data.data;
      setUser(userData);
      localStorage.setItem('f9_user', JSON.stringify(userData));
      } catch (err) {
        console.error('Failed to refresh user profile:', err);
      }
    }, [user?.id]);
  
    // Listen for AI generation success to refresh balance
    useEffect(() => {
      aiService.onSuccess = () => {
        refreshUser();
      };
      return () => {
        aiService.onSuccess = null;
      };
    }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isFreePlan: user?.plan !== 'pro',
        isProPlan: user?.plan === 'pro',
        hasPersonalKey: user?.hasPersonalKey === true,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
