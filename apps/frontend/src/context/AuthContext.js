import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Attempt to restore session on mount and sync with database
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);

          // Fetch fresh user data from API
          try {
            const response = await api.get('/api/users/me', {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            if (response.data && response.data.success) {
              setUser(response.data.user);
              localStorage.setItem('user', JSON.stringify(response.data.user));
            }
          } catch (apiErr) {
            console.error('Failed to sync user session with backend:', apiErr);
          }
        }
      } catch (e) {
        console.error('Failed to parse stored user session:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  /**
   * Helper to manually update user details in Context & local storage
   */
  const updateCurrentUserState = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  /**
   * Handle user login.
   * Calls POST /api/auth/login
   */
  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      setIsAuthenticated(true);

      // Redirect to the main application
      window.location.hash = '#app';
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Invalid credentials or connection issue';
      return { success: false, error: errorMsg };
    }
  };

  /**
   * Handle login with Google OAuth.
   * Calls POST /api/auth/google
   */
  const loginWithGoogle = async (idToken) => {
    try {
      const response = await api.post('/api/auth/google', { idToken });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      setIsAuthenticated(true);

      // Redirect to the main application
      window.location.hash = '#app';
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Google sign-in failed';
      return { success: false, error: errorMsg };
    }
  };

  /**
   * Handle user registration.
   * Calls POST /api/auth/register
   */
  const register = async (username, email, password) => {
    try {
      const response = await api.post('/api/auth/register', { username, email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      setIsAuthenticated(true);

      // Redirect to the main application
      window.location.hash = '#app';
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed';
      return { success: false, error: errorMsg };
    }
  };

  /**
   * Log out user and wipe local credentials.
   */
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);

    // Redirect to login page
    window.location.hash = '#login';
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, loginWithGoogle, register, logout, updateCurrentUserState }}>
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
