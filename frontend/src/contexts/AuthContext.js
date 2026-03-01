import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('crm_token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
      setTenant(response.data.tenant);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loginWithCredentials = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('crm_token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setToken(access_token);
      setUser(userData);
      setTenant(userData.tenant);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.response?.data?.detail || 'Falha no login' };
    }
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setTenant(null);
  };

  const isServerAdmin = () => {
    return user?.role === 'server_admin';
  };

  const isClient = () => {
    return user?.role === 'client';
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenant,
      token,
      loading,
      loginWithCredentials,
      logout,
      isServerAdmin,
      isClient,
      refreshUser: fetchUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
