export interface Host {
  id: number;
  name: string;
  mac_address: string;
  ip: string | null;
  description: string | null;
  created_by: number;
  created_at: string | null;
  public_access: boolean;
  public_access_token: string | null;
  visible_to_roles: string[] | null;
  status?: string;
}

export interface HostStatus {
  host_id: number;
  name: string;
  ip: string | null;
  mac_address: string | null;
  status: string;
  last_check: string | null;
}

export interface ServerConfig {
  serverUrl: string;
  username: string;
  isLoggedIn: boolean;
  lastLoginTimestamp: number;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}
