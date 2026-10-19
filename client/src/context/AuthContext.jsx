import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = async () => {
    const token = apiClient.getToken();
    if (!token) {
      setUser(null);
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiClient.getMe();
      setUser(data.user);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      console.warn('Session restoration failed:', err.message);
      apiClient.clearToken();
      setUser(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email, password) => {
    setError(null);
    const data = await apiClient.login(email, password);
    apiClient.setToken(data.token);
    setUser(data.user);
    await fetchUser();
    return data.user;
  };

  const register = async (name, email, password) => {
    setError(null);
    const data = await apiClient.register(name, email, password);
    apiClient.setToken(data.token);
    setUser(data.user);
    await fetchUser();
    return data.user;
  };

  const logout = () => {
    apiClient.clearToken();
    setUser(null);
    setStats(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      stats,
      loading,
      error,
      login,
      register,
      logout,
      refreshUser: fetchUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
