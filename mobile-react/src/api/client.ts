import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HostStatus } from '../types';

// Constants
const CSRF_TOKEN_KEY = '@csrf_token';
const COOKIES_KEY = '@cookies';

// Custom error for session expiration
export class SessionExpiredError extends Error {
  constructor(message: string = 'Session expired. Please login again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

class ApiClient {
  private axiosInstance: AxiosInstance | null = null;
  private baseURL: string | null = null;
  private csrfToken: string | null = null;
  private cookies: string | null = null;

  /**
   * Initialize the API client with a base URL
   * Supports both HTTP and HTTPS
   */
  initialize(serverUrl: string) {
    // Ensure URL has protocol
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      serverUrl = `http://${serverUrl}`;
    }

    // Ensure URL ends with /
    if (!serverUrl.endsWith('/')) {
      serverUrl = `${serverUrl}/`;
    }

    this.baseURL = serverUrl;

    // Create axios instance with proper configuration
    this.axiosInstance = axios.create({
      baseURL: serverUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // Don't follow redirects - we want to detect them
      maxRedirects: 0,
      validateStatus: (status) => {
        // Accept all status codes to handle them manually
        return status >= 200 && status < 500;
      },
    });

    // Request interceptor - add cookies and CSRF token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add cookies to request
        if (this.cookies) {
          config.headers.Cookie = this.cookies;
        }

        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - save cookies and handle errors
    this.axiosInstance.interceptors.response.use(
      async (response) => {
        // Extract and save cookies from response
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
          this.cookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
          await AsyncStorage.setItem(COOKIES_KEY, this.cookies);
          console.log('[API] Cookies saved');
        }

        console.log(`[API] Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error: AxiosError) => {
        console.error('[API] Error:', error.message);
        return Promise.reject(error);
      }
    );

    console.log('[API] Client initialized with URL:', serverUrl);
  }

  /**
   * Restore session from storage
   */
  async restoreSession(): Promise<boolean> {
    try {
      const [savedCsrf, savedCookies] = await Promise.all([
        AsyncStorage.getItem(CSRF_TOKEN_KEY),
        AsyncStorage.getItem(COOKIES_KEY),
      ]);

      if (savedCsrf && savedCookies) {
        this.csrfToken = savedCsrf;
        this.cookies = savedCookies;
        console.log('[API] Session restored from storage');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[API] Failed to restore session:', error);
      return false;
    }
  }

  /**
   * Clear session data
   */
  async clearSession() {
    this.csrfToken = null;
    this.cookies = null;
    await Promise.all([
      AsyncStorage.removeItem(CSRF_TOKEN_KEY),
      AsyncStorage.removeItem(COOKIES_KEY),
    ]);
    console.log('[API] Session cleared');
  }

  /**
   * Get CSRF token from login page
   */
  async getCsrfToken(): Promise<string> {
    if (!this.axiosInstance) {
      throw new Error('API client not initialized');
    }

    try {
      const response = await this.axiosInstance.get('auth/login');

      if (response.status === 200 && response.data) {
        // Extract CSRF token from HTML
        const html = response.data;
        const match = html.match(/name="csrf_token"[^>]*value="([^"]+)"/);

        if (match && match[1]) {
          this.csrfToken = match[1];
          await AsyncStorage.setItem(CSRF_TOKEN_KEY, this.csrfToken);
          console.log('[API] CSRF token obtained');
          return this.csrfToken;
        }
      }

      throw new Error('Failed to extract CSRF token from login page');
    } catch (error: any) {
      console.error('[API] Get CSRF token error:', error.message);
      throw new Error(`Failed to get CSRF token: ${error.message}`);
    }
  }

  /**
   * Login with username and password
   * Returns true on success, throws error on failure
   */
  async login(username: string, password: string, csrfToken: string): Promise<boolean> {
    if (!this.axiosInstance) {
      throw new Error('API client not initialized');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('csrf_token', csrfToken);

      const response = await this.axiosInstance.post('auth/login', formData.toString());

      // Flask redirects (302/301) on successful login
      if (response.status === 302 || response.status === 301) {
        console.log('[API] Login successful (redirect detected)');
        return true;
      }

      // Status 200 means we're still on login page (failed)
      if (response.status === 200) {
        throw new Error('Invalid username or password');
      }

      throw new Error(`Login failed with status: ${response.status}`);
    } catch (error: any) {
      console.error('[API] Login error:', error.message);
      if (error.message === 'Invalid username or password') {
        throw error;
      }
      throw new Error(`Login error: ${error.message}`);
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    if (!this.axiosInstance) {
      throw new Error('API client not initialized');
    }

    try {
      await this.axiosInstance.get('auth/logout');
      await this.clearSession();
      console.log('[API] Logout successful');
    } catch (error: any) {
      console.error('[API] Logout error:', error.message);
      // Clear session anyway
      await this.clearSession();
    }
  }

  /**
   * Refresh CSRF token
   */
  async refreshCsrfToken(): Promise<string> {
    if (!this.axiosInstance) {
      throw new Error('API client not initialized');
    }

    try {
      const response = await this.axiosInstance.get('auth/api/refresh-csrf-token');

      if (response.status === 200 && response.data?.csrf_token) {
        this.csrfToken = response.data.csrf_token;
        await AsyncStorage.setItem(CSRF_TOKEN_KEY, this.csrfToken);
        console.log('[API] CSRF token refreshed');
        return this.csrfToken;
      }

      throw new Error('Failed to refresh CSRF token');
    } catch (error: any) {
      console.error('[API] Refresh CSRF error:', error.message);
      throw new SessionExpiredError();
    }
  }

  /**
   * Get host statuses
   */
  async getHostStatuses(): Promise<HostStatus[]> {
    if (!this.axiosInstance) {
      throw new Error('API client not initialized');
    }

    try {
      const response = await this.axiosInstance.get('hosts/api/status');

      // Check for redirect (session expired)
      if (response.status === 302 || response.status === 301) {
        throw new SessionExpiredError();
      }

      // Check if we got HTML instead of JSON (redirected to login)
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('text/html')) {
        throw new SessionExpiredError();
      }

      if (response.status === 200 && response.data?.statuses) {
        return response.data.statuses;
      }

      throw new Error(`Failed to get host statuses: ${response.status}`);
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        throw error;
      }
      console.error('[API] Get host statuses error:', error.message);
      throw new Error(`Failed to get host statuses: ${error.message}`);
    }
  }

  /**
   * Wake a host
   */
  async wakeHost(hostId: number): Promise<boolean> {
    if (!this.axiosInstance) {
      throw new Error('API client not initialized');
    }

    // Get fresh CSRF token if needed
    if (!this.csrfToken) {
      await this.refreshCsrfToken();
    }

    try {
      const formData = new URLSearchParams();
      formData.append('csrf_token', this.csrfToken!);

      const response = await this.axiosInstance.post(
        `wol/wake/${hostId}`,
        formData.toString()
      );

      // Check for redirect (session expired)
      if (response.status === 302 || response.status === 301) {
        throw new SessionExpiredError();
      }

      if (response.status === 200) {
        console.log(`[API] Host ${hostId} woken successfully`);
        return true;
      }

      throw new Error(`Failed to wake host: ${response.status}`);
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        throw error;
      }
      console.error('[API] Wake host error:', error.message);
      throw new Error(`Failed to wake host: ${error.message}`);
    }
  }

  /**
   * Check if session is valid
   */
  async checkSession(): Promise<boolean> {
    try {
      await this.getHostStatuses();
      return true;
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        return false;
      }
      // Other errors might just be network issues
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
