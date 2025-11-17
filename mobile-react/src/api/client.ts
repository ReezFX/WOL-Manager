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
    console.log('[API] Initializing with raw URL:', serverUrl);
    
    // Trim whitespace
    serverUrl = serverUrl.trim();
    
    if (!serverUrl) {
      throw new Error('Server URL is required');
    }

    // Ensure URL has protocol
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      serverUrl = `http://${serverUrl}`;
    }

    // Remove trailing slash for consistency
    if (serverUrl.endsWith('/')) {
      serverUrl = serverUrl.slice(0, -1);
    }

    this.baseURL = serverUrl;
    console.log('[API] BaseURL set to:', this.baseURL);

    // Create axios instance with proper configuration for React Native
    this.axiosInstance = axios.create({
      baseURL: serverUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/json',
      },
      // Don't follow redirects - we want to detect them
      maxRedirects: 0,
      validateStatus: (status) => {
        // Accept all status codes to handle them manually
        return status >= 200 && status < 500;
      },
      // React Native specific
      withCredentials: false, // We handle cookies manually
    });

    // Request interceptor - add cookies and CSRF token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add cookies to request
        if (this.cookies) {
          config.headers.Cookie = this.cookies;
        }

        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        console.log('[API] Request headers:', JSON.stringify(config.headers));
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - save cookies and handle errors
    this.axiosInstance.interceptors.response.use(
      async (response) => {
        // Extract and save cookies from response
        // In React Native, set-cookie might be in different formats
        const setCookieHeader = response.headers['set-cookie'] || response.headers['Set-Cookie'];
        if (setCookieHeader) {
          // Parse cookies and extract session cookie
          const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
          const sessionCookies = cookieArray
            .map(cookie => {
              // Extract cookie name=value pair (before first semicolon)
              const match = cookie.match(/^([^=]+=[^;]+)/);
              return match ? match[1] : null;
            })
            .filter(Boolean);
          
          if (sessionCookies.length > 0) {
            this.cookies = sessionCookies.join('; ');
            await AsyncStorage.setItem(COOKIES_KEY, this.cookies);
            console.log('[API] Cookies saved:', this.cookies.substring(0, 50) + '...');
          }
        }

        console.log(`[API] Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error: AxiosError) => {
        console.error('[API] Error:', error.message);
        if (error.response) {
          console.error('[API] Error Response:', error.response.status, error.response.statusText);
        } else if (error.request) {
          console.error('[API] No response received. Request:', error.request._url || 'unknown');
        }
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
      console.log('[API] Fetching CSRF token from:', `${this.baseURL}/auth/login`);
      const response = await this.axiosInstance.get('/auth/login');

      console.log('[API] CSRF response status:', response.status);
      console.log('[API] CSRF response headers:', JSON.stringify(response.headers));

      if (response.status === 200 && response.data) {
        // Extract CSRF token from HTML
        const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        console.log('[API] HTML length:', html.length);
        
        // Try multiple regex patterns
        const patterns = [
          /name="csrf_token"[^>]*value="([^"]+)"/,
          /id="csrf_token"[^>]*value="([^"]+)"/,
          /<input[^>]*name="csrf_token"[^>]*value="([^"]+)"/,
          /value="([^"]+)"[^>]*name="csrf_token"/,
        ];

        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            this.csrfToken = match[1];
            await AsyncStorage.setItem(CSRF_TOKEN_KEY, this.csrfToken);
            console.log('[API] CSRF token obtained:', this.csrfToken.substring(0, 10) + '...');
            return this.csrfToken;
          }
        }

        console.error('[API] HTML sample:', html.substring(0, 500));
      }

      throw new Error('Failed to extract CSRF token from login page');
    } catch (error: any) {
      console.error('[API] Get CSRF token error:', error.message);
      if (error.response) {
        console.error('[API] Error response status:', error.response.status);
        console.error('[API] Error response data:', error.response.data);
      }
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
      // Build form data exactly like browser does
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('csrf_token', csrfToken);
      formData.append('remember', 'false'); // Add remember field

      console.log('[API] Sending login request with cookies:', this.cookies?.substring(0, 50) + '...');

      // IMPORTANT: Must use same URL format as GET (with leading slash)
      // and explicitly set Content-Type header
      const response = await this.axiosInstance.post('/auth/login', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('[API] Login response status:', response.status);
      console.log('[API] Login response content-type:', response.headers['content-type']);

      // Flask redirects (302/301) on successful login
      if (response.status === 302 || response.status === 301) {
        console.log('[API] Login successful (redirect detected)');
        return true;
      }

      // Status 200 could mean:
      // 1. Still on login page (failed)
      // 2. Followed redirect to dashboard (success)
      if (response.status === 200) {
        const contentType = response.headers['content-type'] || '';
        const html = typeof response.data === 'string' ? response.data : '';
        
        // Check if we got redirected to dashboard (successful login)
        // Dashboard HTML contains specific elements that login page doesn't have
        if (html.includes('dashboard') || html.includes('host-list') || html.includes('Hosts')) {
          console.log('[API] Login successful (redirected to dashboard)');
          return true;
        }
        
        // Check if we're still on login page (has login form)
        if (html.includes('name="csrf_token"') && html.includes('name="password"')) {
          console.log('[API] Login failed - still on login page');
          throw new Error('Invalid username or password');
        }
        
        // Fallback: Try to verify session is valid
        console.log('[API] Unclear login result, checking session...');
        try {
          const sessionValid = await this.checkSession();
          if (sessionValid) {
            console.log('[API] Login successful (session verified)');
            return true;
          }
        } catch (e) {
          console.log('[API] Session check failed');
        }
        
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

  /**
   * Get all hosts with full data
   * Uses getHostStatuses which returns complete host information
   */
  async getHosts(): Promise<any[]> {
    if (!this.axiosInstance) {
      throw new Error('API client not initialized');
    }

    try {
      // Use the status API endpoint which returns full host data
      const statuses = await this.getHostStatuses();
      
      // Map to a consistent format
      return statuses.map(host => ({
        id: host.host_id,
        host_id: host.host_id,
        name: host.name || `Host ${host.host_id}`,
        mac_address: host.mac_address || '',
        ip: host.ip || '',
        ip_address: host.ip || '',
        description: host.description || '',
        status: host.status,
        last_check: host.last_check,
      }));
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        throw error;
      }
      console.error('[API] Get hosts error:', error.message);
      throw new Error(`Failed to get hosts: ${error.message}`);
    }
  }

  /**
   * Delete a host
   * Uses X-Requested-With header to get JSON response instead of HTML
   */
  async deleteHost(hostId: number): Promise<boolean> {
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

      console.log('[API] Deleting host with CSRF token:', this.csrfToken?.substring(0, 20) + '...');

      const response = await this.axiosInstance.post(
        `hosts/delete/${hostId}`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          maxRedirects: 0, // Don't follow redirects
          validateStatus: (status) => {
            // Accept all status codes including redirects
            return status >= 200 && status < 500;
          },
        }
      );

      // Check for redirect (session expired)
      if (response.status === 302 || response.status === 301) {
        throw new SessionExpiredError();
      }

      // Handle content type explicitly
      const contentType = (response.headers['content-type'] || '').toLowerCase();

      if (response.status === 200) {
        if (contentType.includes('application/json')) {
          console.log('[API] Delete response (json):', JSON.stringify(response.data));
          if (response.data && response.data.success === true) {
            console.log(`[API] Host ${hostId} deleted successfully`);
            return true;
          }
          if (response.data && response.data.error) {
            throw new Error(response.data.error);
          }
          // Unknown JSON shape but 200 -> success
          return true;
        }

        if (contentType.includes('text/html')) {
          // Server returned HTML (likely redirect page) -> deletion probably failed (permission) or succeeded with redirect
          const html: string = typeof response.data === 'string' ? response.data : '';
          if (html.includes('permission') || html.toLowerCase().includes('do not have permission')) {
            throw new Error('You do not have permission to delete this host');
          }
          if (html.toLowerCase().includes('host') && html.toLowerCase().includes('deleted')) {
            return true;
          }
          // Unclear HTML -> assume success but recommend refresh
          console.warn('[API] HTML response on delete, proceeding as success');
          return true;
        }

        // Default: treat 200 as success
        return true;
      }

      throw new Error(`Failed to delete host: ${response.status}`);
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        throw error;
      }
      console.error('[API] Delete host error:', error.message);
      throw new Error(`Failed to delete host: ${error.message}`);
    }
  }

  /**
   * Add a new host
   */
  async addHost(hostData: {
    name: string;
    macAddress: string;
    ipAddress?: string;
    description?: string;
    visibleToRoles?: number[];
    publicAccess?: boolean;
  }): Promise<boolean> {
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
      formData.append('name', hostData.name);
      formData.append('mac_address', hostData.macAddress);
      
      if (hostData.ipAddress) {
        formData.append('ip_address', hostData.ipAddress);
      }
      
      if (hostData.description) {
        formData.append('description', hostData.description);
      }
      
      if (hostData.visibleToRoles && hostData.visibleToRoles.length > 0) {
        hostData.visibleToRoles.forEach(roleId => {
          formData.append('visible_to_roles', roleId.toString());
        });
      }
      
      if (hostData.publicAccess) {
        formData.append('public_access', 'true');
      }

      const response = await this.axiosInstance.post(
        'hosts/add',
        formData.toString()
      );

      // Check for redirect (session expired)
      if (response.status === 302 || response.status === 301) {
        throw new SessionExpiredError();
      }

      if (response.status === 200) {
        console.log('[API] Host added successfully');
        return true;
      }

      throw new Error(`Failed to add host: ${response.status}`);
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        throw error;
      }
      console.error('[API] Add host error:', error.message);
      throw new Error(`Failed to add host: ${error.message}`);
    }
  }

  /**
   * Get available roles
   */
  async getRoles(): Promise<Array<{ id: number; name: string }>> {
    if (!this.axiosInstance) {
      throw new Error('API client not initialized');
    }

    try {
      const response = await this.axiosInstance.get('hosts/api/roles');

      // Check for redirect (session expired)
      if (response.status === 302 || response.status === 301) {
        throw new SessionExpiredError();
      }

      if (response.status === 200 && response.data?.roles) {
        console.log('[API] Roles retrieved successfully:', response.data.roles);
        return response.data.roles;
      }

      // Fallback to default roles if API doesn't exist
      console.log('[API] Roles API not available, using defaults');
      return [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'User' },
        { id: 3, name: 'Guest' },
      ];
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        throw error;
      }
      console.error('[API] Get roles error:', error.message);
      // Return default roles on error
      return [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'User' },
        { id: 3, name: 'Guest' },
      ];
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
