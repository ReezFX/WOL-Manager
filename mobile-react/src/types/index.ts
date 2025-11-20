// API Types
export interface ServerConfig {
  serverUrl: string;
  username?: string;
  isLoggedIn: boolean;
  lastLoginTimestamp?: number;
}

export interface PublicHostConfig {
  publicHostUrl: string; // Full URL like http://localhost:8008/public/host/token
  token: string; // Extracted token from URL
  serverBaseUrl: string; // Base server URL extracted from publicHostUrl
  hostName?: string; // Cached host name
  lastAccessTimestamp?: number;
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

export interface PublicHost {
  id: number;
  name: string;
  mac_address: string;
  description?: string;
  status: 'online' | 'offline' | 'unknown';
  last_check?: string;
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
  PublicHost: { publicHostConfig: PublicHostConfig };
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

// Widget Types
export interface WidgetConfig {
  widgetId: number;
  hostId?: number; // For server hosts
  hostName: string;
  macAddress: string;
  ipAddress?: string;
  configType: 'server' | 'publicHost';
  // For server hosts
  serverUrl?: string;
  // For public hosts
  publicHostUrl?: string;
  token?: string;
  serverBaseUrl?: string;
  createdAt: number;
  lastUpdated: number;
}
