import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface UserProfile {
  username: string;
  role: string;
  must_change_password: boolean;
}

export interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<UserProfile>;
  logout: () => void;
  me: () => Promise<UserProfile | null>;
  setMustChangePassword: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const me = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const data = await apiClient<UserProfile>('/api/auth/me');
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  const login = async (username: string, password: string): Promise<UserProfile> => {
    const res = await apiClient<{
      access_token: string;
      token_type: string;
      role: string;
      must_change_password: boolean;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    const authToken = res.access_token;
    const profile: UserProfile = {
      username,
      role: res.role,
      must_change_password: res.must_change_password,
    };

    setToken(authToken);
    setUser(profile);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(profile));

    return profile;
  };

  const setMustChangePassword = useCallback((val: boolean) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, must_change_password: val };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        await me();
      }
      setIsLoading(false);
    };
    initAuth();
  }, [me]);

  const value: AuthContextType = {
    token,
    user,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    me,
    setMustChangePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
