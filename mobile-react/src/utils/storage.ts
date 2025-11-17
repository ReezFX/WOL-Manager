import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServerConfig, PublicHostConfig } from '../types';

const SERVER_CONFIG_KEY = '@server_config';
const PUBLIC_HOST_CONFIG_KEY = '@public_host_config';

export const storage = {
  /**
   * Save server configuration
   */
  async saveServerConfig(config: ServerConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(config));
      console.log('[Storage] Server config saved');
    } catch (error) {
      console.error('[Storage] Failed to save server config:', error);
      throw error;
    }
  },

  /**
   * Get server configuration
   */
  async getServerConfig(): Promise<ServerConfig | null> {
    try {
      const configStr = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
      if (configStr) {
        const config = JSON.parse(configStr);
        console.log('[Storage] Server config loaded');
        return config;
      }
      return null;
    } catch (error) {
      console.error('[Storage] Failed to get server config:', error);
      return null;
    }
  },

  /**
   * Clear server configuration
   */
  async clearServerConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SERVER_CONFIG_KEY);
      console.log('[Storage] Server config cleared');
    } catch (error) {
      console.error('[Storage] Failed to clear server config:', error);
      throw error;
    }
  },

  /**
   * Update server configuration
   */
  async updateServerConfig(updates: Partial<ServerConfig>): Promise<void> {
    try {
      const existing = await this.getServerConfig();
      if (existing) {
        const updated = { ...existing, ...updates };
        await this.saveServerConfig(updated);
      }
    } catch (error) {
      console.error('[Storage] Failed to update server config:', error);
      throw error;
    }
  },

  /**
   * Save public host configuration
   */
  async savePublicHostConfig(config: PublicHostConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(PUBLIC_HOST_CONFIG_KEY, JSON.stringify(config));
      console.log('[Storage] Public host config saved');
    } catch (error) {
      console.error('[Storage] Failed to save public host config:', error);
      throw error;
    }
  },

  /**
   * Get public host configuration
   */
  async getPublicHostConfig(): Promise<PublicHostConfig | null> {
    try {
      const configStr = await AsyncStorage.getItem(PUBLIC_HOST_CONFIG_KEY);
      if (configStr) {
        const config = JSON.parse(configStr);
        console.log('[Storage] Public host config loaded');
        return config;
      }
      return null;
    } catch (error) {
      console.error('[Storage] Failed to get public host config:', error);
      return null;
    }
  },

  /**
   * Clear public host configuration
   */
  async clearPublicHostConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PUBLIC_HOST_CONFIG_KEY);
      console.log('[Storage] Public host config cleared');
    } catch (error) {
      console.error('[Storage] Failed to clear public host config:', error);
      throw error;
    }
  },

  /**
   * Check what type of configuration exists
   * Returns: 'server' | 'publicHost' | null
   */
  async getConfigType(): Promise<'server' | 'publicHost' | null> {
    try {
      const [serverConfig, publicHostConfig] = await Promise.all([
        this.getServerConfig(),
        this.getPublicHostConfig(),
      ]);

      if (publicHostConfig) return 'publicHost';
      if (serverConfig) return 'server';
      return null;
    } catch (error) {
      console.error('[Storage] Failed to get config type:', error);
      return null;
    }
  },

  /**
   * Clear all configurations
   */
  async clearAllConfigs(): Promise<void> {
    try {
      await Promise.all([
        this.clearServerConfig(),
        this.clearPublicHostConfig(),
      ]);
      console.log('[Storage] All configs cleared');
    } catch (error) {
      console.error('[Storage] Failed to clear all configs:', error);
      throw error;
    }
  },
};
