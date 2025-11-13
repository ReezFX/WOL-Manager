import AsyncStorage from '@react-native-async-storage/async-storage';
import { ServerConfig } from '../types';

const SERVER_CONFIG_KEY = '@server_config';

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
};
