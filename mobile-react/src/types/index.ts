// API Types
export interface ServerConfig {
  serverUrl: string;
  username?: string;
  isLoggedIn: boolean;
  lastLoginTimestamp?: number;
}

export interface Host {
  id: number;
  name: string;
  mac_address: string;
  ip_address?: string;
  description?: string;
  public_access_enabled: boolean;
  public_access_hash?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HostStatus {
  host_id: number;
  status: 'online' | 'offline' | 'unknown';
  last_seen?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  is_admin: boolean;
}

// Navigation Types
export type RootStackParamList = {
  Setup: undefined;
  Login: { serverUrl: string };
  Main: undefined;
};

export type MainTabParamList = {
  Hosts: undefined;
  Admin: undefined;
  Settings: undefined;
};

export type HostStackParamList = {
  HostList: undefined;
  HostDetail: { hostId: number };
  HostEdit: { hostId?: number };
};
