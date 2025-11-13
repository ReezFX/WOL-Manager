import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, SessionExpiredError } from '../api/client';
import { storage } from '../utils/storage';
import { ServerConfig } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  serverConfig: ServerConfig | null;
  error: string | null;
  login: (username: string, password: string, serverUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeApp: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize app - check for existing session
   */
  const initializeApp = async () => {
    try {
      setIsLoading(true);
      console.log('[Auth] Initializing app...');

      // Load server config
      const config = await storage.getServerConfig();
      if (!config) {
        console.log('[Auth] No saved server config');
        setIsLoading(false);
        return;
      }

      setServerConfig(config);

      // Initialize API client
      apiClient.initialize(config.serverUrl);

      // Try to restore session
      const restored = await apiClient.restoreSession();
      if (restored) {
        console.log('[Auth] Session restored, checking validity...');
        
        // Verify session is still valid
        const isValid = await apiClient.checkSession();
        if (isValid) {
          console.log('[Auth] Session is valid');
          setIsAuthenticated(true);
        } else {
          console.log('[Auth] Session expired');
          await storage.updateServerConfig({ isLoggedIn: false });
        }
      } else {
        console.log('[Auth] No session to restore');
      }
    } catch (error: any) {
      console.error('[Auth] Initialize error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login
   */
  const login = async (username: string, password: string, serverUrl: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[Auth] Logging in...');

      // Initialize API client
      apiClient.initialize(serverUrl);

      // Get CSRF token
      console.log('[Auth] Getting CSRF token...');
      const csrfToken = await apiClient.getCsrfToken();

      // Attempt login
      console.log('[Auth] Attempting login...');
      await apiClient.login(username, password, csrfToken);

      // Save server config
      const config: ServerConfig = {
        serverUrl,
        username,
        isLoggedIn: true,
        lastLoginTimestamp: Date.now(),
      };
      await storage.saveServerConfig(config);
      setServerConfig(config);

      // Update state
      setIsAuthenticated(true);
      console.log('[Auth] Login successful');
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      console.log('[Auth] Logging out...');

      // Call logout API
      await apiClient.logout();

      // Clear storage
      await storage.clearServerConfig();

      // Update state
      setIsAuthenticated(false);
      setServerConfig(null);
      console.log('[Auth] Logout successful');
    } catch (error: any) {
      console.error('[Auth] Logout error:', error);
      // Still clear local state even if API call fails
      setIsAuthenticated(false);
      setServerConfig(null);
      await storage.clearServerConfig();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear error
   */
  const clearError = () => {
    setError(null);
  };

  // Initialize on mount
  useEffect(() => {
    initializeApp();
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    serverConfig,
    error,
    login,
    logout,
    clearError,
    initializeApp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
