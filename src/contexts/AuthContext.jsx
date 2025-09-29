import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext({
  user: null,
  token: null,
  pamLogin: () => {},
  logout: () => {},
  isLoading: true,
  needsSetup: false,
  pamAvailable: false,
  error: null
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth-token'));
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [pamAvailable, setPamAvailable] = useState(false);
  const [error, setError] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if system needs setup and PAM availability
      const statusResponse = await api.auth.status();
      const statusData = await statusResponse.json();

      setPamAvailable(statusData.pamAvailable || false);

      if (statusData.needsSetup) {
        setNeedsSetup(true);
        setIsLoading(false);
        return;
      }

      // If we have a token, verify it
      if (token) {
        try {
          const userResponse = await api.auth.user();

          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUser(userData.user);
            setNeedsSetup(false);
          } else {
            // Token is invalid
            localStorage.removeItem('auth-token');
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('auth-token');
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setError('Failed to check authentication status');
    } finally {
      setIsLoading(false);
    }
  };


  const pamLogin = async (username, password) => {
    try {
      setError(null);
      const response = await api.auth.pamLogin(username, password);

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        setNeedsSetup(false);
        localStorage.setItem('auth-token', data.token);
        return { success: true };
      } else {
        setError(data.error || 'PAM login failed');
        return { success: false, error: data.error || 'PAM login failed' };
      }
    } catch (error) {
      console.error('PAM login error:', error);
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth-token');
    
    // Optional: Call logout endpoint for logging
    if (token) {
      api.auth.logout().catch(error => {
        console.error('Logout endpoint error:', error);
      });
    }
  };

  const value = {
    user,
    token,
    pamLogin,
    logout,
    isLoading,
    needsSetup,
    pamAvailable,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};