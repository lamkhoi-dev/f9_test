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

  // --- Helpers ---

  const saveAuth = (userData: User, tokenStr: string) => {
    setUser(userData);
    setToken(tokenStr);
    localStorage.setItem('f9_token', tokenStr);
    localStorage.setItem('f9_user', JSON.stringify(userData));
  };

  // Fetch fresh user profile from server and update state + localStorage
  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const userData: User = res.data.data?.user ?? res.data.data;
      if (userData?.id) {
        setUser(userData);
        localStorage.setItem('f9_user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  }, []);

  // --- Auth actions ---

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

  // --- Side effects ---

  // On mount: load localStorage immediately (fast render), then fetch fresh data
  // from server so admin-upgraded plans are reflected without requiring re-login.
  useEffect(() => {
    const savedToken = localStorage.getItem('f9_token');
    const savedUser = localStorage.getItem('f9_user');

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);

        // Sync fresh plan/balance — fixes stale localStorage after admin upgrades plan
        apiClient.get('/auth/me')
          .then(res => {
            const userData: User = res.data.data?.user ?? res.data.data;
            if (userData?.id) {
              setUser(userData);
              localStorage.setItem('f9_user', JSON.stringify(userData));
            }
          })
          .catch(() => { /* server unreachable — keep cached version */ })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem('f9_token');
        localStorage.removeItem('f9_user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  // Re-sync when user returns to the tab (covers: admin upgraded in a separate window)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token) {
        apiClient.get('/auth/me')
          .then(res => {
            const userData: User = res.data.data?.user ?? res.data.data;
            if (userData?.id) {
              setUser(userData);
              localStorage.setItem('f9_user', JSON.stringify(userData));
            }
          })
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token]);

  // Refresh balance/plan after successful AI generation
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
        isFreePlan: !user || (user.plan ?? 'free') !== 'pro',
        isProPlan: (user?.plan ?? 'free') === 'pro',
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
