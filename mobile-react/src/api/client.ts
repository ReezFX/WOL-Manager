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
   * Get public host information and status
   * Does not require authentication
   */
  async getPublicHostStatus(serverBaseUrl: string, token: string): Promise<{
    host_id: number;
    name: string;
    status: 'online' | 'offline' | 'unknown';
    last_check: string;
  }> {
    try {
      // Create a temporary axios instance for this public request
      const publicAxios = axios.create({
        baseURL: serverBaseUrl,
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        },
      });

      const response = await publicAxios.get(`/public/host/${token}/status`);

      if (response.status === 200 && response.data) {
        console.log('[API] Public host status retrieved:', response.data);
        return response.data;
      }

      throw new Error(`Failed to get public host status: ${response.status}`);
    } catch (error: any) {
      console.error('[API] Get public host status error:', error.message);
      throw new Error(`Failed to get public host status: ${error.message}`);
    }
  }

  /**
   * Get public host details
   * Does not require authentication, but we parse the HTML response
   */
  async getPublicHostDetails(serverBaseUrl: string, token: string): Promise<{
    id: number;
    name: string;
    mac_address: string;
    description?: string;
  }> {
    try {
      // Create a temporary axios instance for this public request
      const publicAxios = axios.create({
        baseURL: serverBaseUrl,
        timeout: 10000,
      });

      const response = await publicAxios.get(`/public/host/${token}`);

      if (response.status === 200 && response.data) {
        // The endpoint returns HTML, so we need to extract data from it
        const html = typeof response.data === 'string' ? response.data : '';
        
        // Extract host details from HTML
        // This is a simplified parser - in production you might want a proper HTML parser
        
        // Updated regex patterns to be more robust and match the actual HTML structure
        // The HTML structure might vary slightly depending on the template
        
        // 1. Match Name (usually in a h4 or similar header)
        // Trying: <h4 class="card-title..."><i ...></i> HostName</h4>
        let name = '';
        const nameMatch = html.match(/<h4[^>]*class=\"card-title[^>]*>(?:<i[^>]*><\/i>)?\s*([^<]+)\s*<\/h4>/i);
        if (nameMatch && nameMatch[1]) {
          name = nameMatch[1].trim();
        } else {
          // Fallback: try to find any header with the name
          // or look for title in head
          const titleMatch = html.match(/<title>([^<]+)\s*-\s*WOL Manager<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            name = titleMatch[1].trim();
          }
        }

        // 2. Match MAC Address (usually in a p tag with class or strong tag)
        // Trying: <strong>MAC Address:</strong> <span ...>XX:XX:XX:XX:XX:XX</span>
        // Or: <p class="mac-address">XX:XX:XX:XX:XX:XX</p>
        let macAddress = '';
        // Look for pattern XX:XX:XX:XX:XX:XX
        const macPattern = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/g;
        const macMatches = html.match(macPattern);
        if (macMatches && macMatches.length > 0) {
          macAddress = macMatches[0];
        }

        // 3. Match ID (data attribute or hidden input)
        // Trying: data-host-id="123"
        let id = 0;
        const idMatch = html.match(/data-host-id=\"(\d+)\"/i) || 
                        html.match(/name=\"host_id\"[^>]*value=\"(\d+)\"/i) ||
                        html.match(/value=\"(\d+)\"[^>]*name=\"host_id\"/i);
        
        if (idMatch && idMatch[1]) {
          id = parseInt(idMatch[1]);
        }

        // 4. Match Description
        let description = undefined;
        // Look for "Description" label followed by content
        const descMatch = html.match(/Description<\/h6>\s*<p[^>]*>([^<]+)<\/p>/i);
        if (descMatch && descMatch[1]) {
          description = descMatch[1].trim();
        }
        
        if (!name || !macAddress || !id) {
          console.error('[API] Failed to parse host details. Found:', { name, macAddress, id });
          console.log('[API] HTML Sample:', html.substring(0, 1000)); // Log start of HTML for debugging
          throw new Error('Failed to parse host details from response');
        }

        return {
          id,
          name,
          mac_address: macAddress,
          description,
        };
      }

      throw new Error(`Failed to get public host details: ${response.status}`);
    } catch (error: any) {
      console.error('[API] Get public host details error:', error.message);
      throw new Error(`Failed to get public host details: ${error.message}`);
    }
  }

  /**
   * Wake a public host
   * Does not require user authentication, but needs CSRF token
   */
  async wakePublicHost(serverBaseUrl: string, token: string, hostId: number): Promise<boolean> {
    try {
      // First, get CSRF token from the public host page
      const publicAxios = axios.create({
        baseURL: serverBaseUrl,
        timeout: 10000,
      });

      // Get the public host page to extract CSRF token
      const pageResponse = await publicAxios.get(`/public/host/${token}`);
      const html = typeof pageResponse.data === 'string' ? pageResponse.data : '';
      
      // Extract CSRF token
      const csrfMatch = html.match(/name="csrf_token"[^>]*value="([^"]+)"/i) ||
                        html.match(/value="([^"]+)"[^>]*name="csrf_token"/i);
      
      if (!csrfMatch || !csrfMatch[1]) {
        throw new Error('Failed to extract CSRF token from public host page');
      }

      const csrfToken = csrfMatch[1];
      console.log('[API] Public host CSRF token obtained');

      // Extract cookies from the page response
      const setCookieHeader = pageResponse.headers['set-cookie'] || pageResponse.headers['Set-Cookie'];
      let cookies = '';
      if (setCookieHeader) {
        const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        const sessionCookies = cookieArray
          .map(cookie => {
            const match = cookie.match(/^([^=]+=[^;]+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean);
        cookies = sessionCookies.join('; ');
      }

      // Send wake request
      const formData = new URLSearchParams();
      formData.append('csrf_token', csrfToken);
      formData.append('host_id', hostId.toString());

      const wakeResponse = await publicAxios.post(
        '/public/host/wake',
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookies,
          },
        }
      );

      // Check for success (redirect or 200)
      if (wakeResponse.status === 200 || wakeResponse.status === 302 || wakeResponse.status === 301) {
        console.log(`[API] Public host ${hostId} woken successfully`);
        return true;
      }

      throw new Error(`Failed to wake public host: ${wakeResponse.status}`);
    } catch (error: any) {
      console.error('[API] Wake public host error:', error.message);
      throw new Error(`Failed to wake public host: ${error.message}`);
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
  /**
   * Get current session cookies
   */
  getCookies(): string | null {
    return this.cookies;
  }

  /**
   * Get current CSRF token
   */
  getCsrfTokenValue(): string | null {
    return this.csrfToken;
  }

  /**
   * Get application settings
   * Requires admin authentication
   */
  async getSettings(): Promise<{
    success: boolean;
    settings?: {
      min_password_length: number;
      require_special_characters: boolean;
      require_numbers: boolean;
      password_expiration_days: number;
      session_timeout_minutes: number;
      max_concurrent_sessions: number;
      log_profile: string;
    };
    current_log_profile?: string;
    message?: string;
  }> {
    if (!this.axiosInstance) {
      throw new Error('API client not initialized');
    }

    try {
      const response = await this.axiosInstance.get('admin/settings');

      // Check for redirect (session expired or not authorized)
      if (response.status === 302 || response.status === 301) {
        throw new SessionExpiredError();
      }

      // Check if we got HTML instead of JSON (not authorized or redirected)
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('text/html')) {
        const html = typeof response.data === 'string' ? response.data : '';
        
        // Parse settings from HTML form
        if (response.status === 200 && html.includes('Application Settings')) {
          console.log('[API] Parsing settings from HTML');
          
          // Extract form field values using regex
          const extractValue = (fieldName: string): string => {
            const pattern = new RegExp(`name="${fieldName}"[^>]*value="([^"]*)"`, 'i');
            const match = html.match(pattern);
            return match ? match[1] : '';
          };

          const extractChecked = (fieldName: string): boolean => {
            // Look for the checkbox input and check if it has 'checked' attribute
            // WTForms BooleanField renders as: <input ... name="fieldName" ... checked ... >
            // or <input ... name="fieldName" ... > (without checked)
            const inputPattern = new RegExp(`<input[^>]*name="${fieldName}"[^>]*>`, 'i');
            const inputMatch = html.match(inputPattern);
            if (inputMatch && inputMatch[0]) {
              const inputTag = inputMatch[0];
              // Check if 'checked' appears in the input tag (as attribute)
              return /\bchecked\b/i.test(inputTag);
            }
            return false;
          };

          const extractSelectedOption = (fieldName: string): string => {
            // Look for <select name="fieldName">...</select> and find selected option
            const selectPattern = new RegExp(`<select[^>]*name="${fieldName}"[^>]*>([\s\S]*?)<\/select>`, 'i');
            const selectMatch = html.match(selectPattern);
            if (selectMatch && selectMatch[1]) {
              const selectContent = selectMatch[1];
              console.log('[API] Select content for', fieldName, ':', selectContent.substring(0, 500));
              
              // Find option with selected attribute - try different patterns
              // Pattern 1: selected before value
              let selectedPattern = /<option[^>]*selected[^>]*value="([^"]*)"/i;
              let selectedMatch = selectContent.match(selectedPattern);
              
              if (!selectedMatch) {
                // Pattern 2: value before selected
                selectedPattern = /<option[^>]*value="([^"]*)"[^>]*selected/i;
                selectedMatch = selectContent.match(selectedPattern);
              }
              
              if (!selectedMatch) {
                // Pattern 3: selected without quotes
                selectedPattern = /<option[^>]*\bselected\b[^>]*value="([^"]*)"/i;
                selectedMatch = selectContent.match(selectedPattern);
              }
              
              if (selectedMatch && selectedMatch[1]) {
                console.log('[API] Found selected option:', selectedMatch[1]);
                return selectedMatch[1];
              }
              
              console.log('[API] No selected option found, trying alternative method');
              
              // Alternative: Check if there's an option that matches current_log_profile text
              // This works if the select is pre-populated with the current value
              const allOptionsPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
              let optionMatch;
              while ((optionMatch = allOptionsPattern.exec(selectContent)) !== null) {
                const [, value, text] = optionMatch;
                console.log('[API] Found option:', value, 'text:', text.trim());
              }
              
              // Fallback: first option value
              const firstOptionPattern = /<option[^>]*value="([^"]*)"/i;
              const firstMatch = selectContent.match(firstOptionPattern);
              if (firstMatch && firstMatch[1]) {
                console.log('[API] Using first option as fallback:', firstMatch[1]);
                return firstMatch[1];
              }
            }
            return '';
          };

          // Extract current log profile from the indicator
          const logProfileMatch = html.match(/id="current-log-profile"[^>]*>([^<]+)</i);
          const currentLogProfile = logProfileMatch ? logProfileMatch[1].trim() : 'MEDIUM';

          const settings = {
            min_password_length: parseInt(extractValue('min_password_length')) || 8,
            require_special_characters: extractChecked('require_special_characters'),
            require_numbers: extractChecked('require_numbers'),
            password_expiration_days: parseInt(extractValue('password_expiration_days')) || 0,
            session_timeout_minutes: parseInt(extractValue('session_timeout_minutes')) || 30,
            max_concurrent_sessions: parseInt(extractValue('max_concurrent_sessions')) || 0,
            log_profile: extractSelectedOption('log_profile') || 'MEDIUM',
          };

          console.log('[API] Settings parsed from HTML:', settings);
          console.log('[API] Checkboxes - require_special_characters:', settings.require_special_characters);
          console.log('[API] Checkboxes - require_numbers:', settings.require_numbers);
          console.log('[API] Selected log_profile:', settings.log_profile);

          return {
            success: true,
            settings,
            current_log_profile: currentLogProfile,
          };
        }
        
        throw new Error('Not authorized to access settings');
      }

      // If we get here with 200 and no data, something went wrong
      throw new Error('Failed to get settings');
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        throw error;
      }
      console.error('[API] Get settings error:', error.message);
      throw new Error(`Failed to get settings: ${error.message}`);
    }
  }

  /**
   * Update application settings
   * Requires admin authentication
   */
  async updateSettings(settings: {
    min_password_length: number;
    require_special_characters: boolean;
    require_numbers: boolean;
    password_expiration_days: number;
    session_timeout_minutes: number;
    max_concurrent_sessions: number;
    log_profile: string;
  }): Promise<{
    success: boolean;
    message?: string;
    current_log_profile?: string;
    errors?: Record<string, string[]>;
  }> {
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
      formData.append('min_password_length', String(settings.min_password_length));
      formData.append('require_special_characters', settings.require_special_characters ? 'y' : '');
      formData.append('require_numbers', settings.require_numbers ? 'y' : '');
      formData.append('password_expiration_days', String(settings.password_expiration_days));
      formData.append('session_timeout_minutes', String(settings.session_timeout_minutes));
      formData.append('max_concurrent_sessions', String(settings.max_concurrent_sessions));
      formData.append('log_profile', settings.log_profile);

      console.log('[API] Updating settings with CSRF token:', this.csrfToken?.substring(0, 20) + '...');

      const response = await this.axiosInstance.post(
        'admin/settings',
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      );

      // Check for redirect (session expired)
      if (response.status === 302 || response.status === 301) {
        throw new SessionExpiredError();
      }

      // Check content type
      const contentType = (response.headers['content-type'] || '').toLowerCase();

      if (response.status === 200) {
        if (contentType.includes('application/json')) {
          console.log('[API] Update settings response (json):', JSON.stringify(response.data));
          
          if (response.data && response.data.success === true) {
            return {
              success: true,
              message: response.data.message || 'Settings saved successfully',
              current_log_profile: response.data.current_log_profile,
            };
          }
          
          if (response.data && response.data.success === false) {
            return {
              success: false,
              message: response.data.message || 'Failed to save settings',
              errors: response.data.errors,
            };
          }

          // Unknown JSON response
          throw new Error('Unexpected response format');
        }

        if (contentType.includes('text/html')) {
          // Server returned HTML (likely redirect or success page)
          const html: string = typeof response.data === 'string' ? response.data : '';
          
          // Check for success indicators in HTML
          if (html.toLowerCase().includes('success') || html.includes('Application Settings')) {
            console.log('[API] Settings updated successfully (HTML response)');
            return {
              success: true,
              message: 'Settings saved successfully',
            };
          }
          
          // Check for error indicators
          if (html.toLowerCase().includes('error') || html.toLowerCase().includes('invalid')) {
            throw new Error('Failed to save settings - validation error');
          }
        }

        // Default: treat 200 as success
        return {
          success: true,
          message: 'Settings saved successfully',
        };
      }

      throw new Error(`Failed to update settings: ${response.status}`);
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        throw error;
      }
      console.error('[API] Update settings error:', error.message);
      throw new Error(`Failed to update settings: ${error.message}`);
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
