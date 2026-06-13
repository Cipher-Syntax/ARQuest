import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await authService.getAccessToken();
      if (token) {
        const response = await api.get('/api/auth/me/');
        // The backend `success_response` wraps in { data: { user: {...} } }
        const payload = response.data.data || response.data;
        setUser(payload.user);
      }
    } catch (e) {
      console.log('Token check failed:', e);
      await authService.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login/', { username, password });
      
      // Extract tokens from the response
      const { access, refresh } = response.data.data || response.data;
      await authService.setTokens(access, refresh);
      
      await checkToken();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const refresh = await authService.getRefreshToken();
      if (refresh) {
        await api.post('/api/auth/logout/', { refresh });
      }
    } catch (e) {
      console.log('Logout API failed, clearing local tokens anyway');
    } finally {
      await authService.clearTokens();
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
