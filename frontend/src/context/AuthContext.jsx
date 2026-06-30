import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data);
          } else {
            logout();
          }
        } catch (err) {
          console.error('Failed to load user session', err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser({
          _id: res.data._id,
          name: res.data.name,
          email: res.data.email,
          energyWindow: res.data.energyWindow,
          geminiApiKey: res.data.geminiApiKey
        });
        return { success: true };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check credentials.'
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await api.post('/auth/register', { name, email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser({
          _id: res.data._id,
          name: res.data.name,
          email: res.data.email,
          energyWindow: res.data.energyWindow,
          geminiApiKey: res.data.geminiApiKey
        });
        return { success: true };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateSettings = async (settings) => {
    try {
      const res = await api.put('/auth/settings', settings);
      if (res.data.success) {
        setUser(prev => ({
          ...prev,
          energyWindow: res.data.energyWindow,
          geminiApiKey: res.data.geminiApiKey
        }));
        return { success: true };
      }
      return { success: false, message: 'Could not save settings' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Update failed.'
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};
