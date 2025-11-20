import { NativeModules } from 'react-native';
import { WidgetConfig } from '../types';

interface WidgetModuleInterface {
  /**
   * Configure a widget with host information
   */
  configureWidget(widgetId: number, hostData: {
    hostId?: number;
    hostName: string;
    macAddress: string;
    ipAddress?: string;
    status?: string;
    cookies?: string;
    csrfToken?: string;
    configType: 'server' | 'publicHost';
    serverUrl?: string;
    publicHostUrl?: string;
    token?: string;
    serverBaseUrl?: string;
  }): Promise<boolean>;

  /**
   * Get configuration for a specific widget
   */
  getWidgetConfig(widgetId: number): Promise<WidgetConfig | null>;

  /**
   * Get all widget configurations
   */
  getAllWidgetConfigs(): Promise<WidgetConfig[]>;

  /**
   * Delete widget configuration
   */
  deleteWidget(widgetId: number): Promise<boolean>;

  /**
   * Get list of all widget IDs currently placed on home screen
   */
  getActiveWidgetIds(): Promise<number[]>;

  /**
   * Update all widgets
   */
  updateAllWidgets(): Promise<boolean>;

  /**
   * Request to pin a widget to the home screen
   * Note: This requires Android O (API 26+) and launcher support
   */
  requestPinWidget(): Promise<boolean>;
}

const { WidgetModule } = NativeModules;

if (!WidgetModule) {
  throw new Error(
    'WidgetModule native module is not available. Make sure the native code is properly linked.'
  );
}

export const widgetModule: WidgetModuleInterface = WidgetModule;

/**
 * Helper functions for widget management
 */

/**
 * Configure a widget for a server host
 */
export const configureWidgetForServerHost = async (
  widgetId: number,
  host: {
    id: number;
    name: string;
    mac_address: string;
    ip_address?: string;
    status?: string;
  },
  serverUrl: string,
  auth: {
    cookies: string;
    csrfToken: string;
  }
): Promise<boolean> => {
  return widgetModule.configureWidget(widgetId, {
    hostId: host.id,
    hostName: host.name,
    macAddress: host.mac_address,
    ipAddress: host.ip_address,
    status: host.status,
    cookies: auth.cookies,
    csrfToken: auth.csrfToken,
    configType: 'server',
    serverUrl,
  });
};

/**
 * Configure a widget for a public host
 */
export const configureWidgetForPublicHost = async (
  widgetId: number,
  publicHostConfig: {
    hostName: string;
    macAddress: string;
    publicHostUrl: string;
    token: string;
    serverBaseUrl: string;
    status?: string;
  }
): Promise<boolean> => {
  return widgetModule.configureWidget(widgetId, {
    hostName: publicHostConfig.hostName,
    macAddress: publicHostConfig.macAddress,
    configType: 'publicHost',
    publicHostUrl: publicHostConfig.publicHostUrl,
    token: publicHostConfig.token,
    serverBaseUrl: publicHostConfig.serverBaseUrl,
    status: publicHostConfig.status,
  });
};

/**
 * Get all configured widgets with their status
 */
export const getConfiguredWidgets = async (): Promise<{
  activeWidgets: WidgetConfig[];
  orphanedConfigs: WidgetConfig[];
  unconfiguredWidgetIds: number[];
}> => {
  console.log('[WidgetModule] Getting configured widgets...');
  const [activeWidgetIds, allConfigs] = await Promise.all([
    widgetModule.getActiveWidgetIds(),
    widgetModule.getAllWidgetConfigs(),
  ]);

  console.log('[WidgetModule] Active widget IDs:', activeWidgetIds);
  console.log('[WidgetModule] All configs:', allConfigs);

  const activeWidgets = allConfigs.filter(config =>
    activeWidgetIds.includes(config.widgetId)
  );

  const orphanedConfigs = allConfigs.filter(
    config => !activeWidgetIds.includes(config.widgetId)
  );

  const configuredWidgetIds = allConfigs.map(c => c.widgetId);
  const unconfiguredWidgetIds = activeWidgetIds.filter(
    id => !configuredWidgetIds.includes(id)
  );

  console.log('[WidgetModule] Active widgets:', activeWidgets.length);
  console.log('[WidgetModule] Orphaned configs:', orphanedConfigs.length);
  console.log('[WidgetModule] Unconfigured widgets:', unconfiguredWidgetIds.length);

  return { activeWidgets, orphanedConfigs, unconfiguredWidgetIds };
};

/**
 * Clean up orphaned widget configurations
 */
export const cleanupOrphanedWidgetConfigs = async (): Promise<number> => {
  const { orphanedConfigs } = await getConfiguredWidgets();
  
  let cleanedCount = 0;
  for (const config of orphanedConfigs) {
    try {
      await widgetModule.deleteWidget(config.widgetId);
      cleanedCount++;
    } catch (error) {
      console.error(`Failed to delete orphaned widget config ${config.widgetId}:`, error);
    }
  }

  return cleanedCount;
};
