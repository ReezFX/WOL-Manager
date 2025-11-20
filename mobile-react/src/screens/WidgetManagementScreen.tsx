import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Card, StatusBadge, EmptyState, Button } from '../components/UI';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiClient, SessionExpiredError } from '../api/client';
import { storage } from '../utils/storage';
import {
  widgetModule,
  configureWidgetForServerHost,
  configureWidgetForPublicHost,
  getConfiguredWidgets,
  cleanupOrphanedWidgetConfigs,
} from '../modules/WidgetModule';
import { WidgetConfig } from '../types';

interface WidgetDisplayItem extends WidgetConfig {
  isUnconfigured?: boolean;
}

import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
} from '../constants/theme';

interface Host {
  id: number;
  host_id: number;
  name: string;
  mac_address: string;
  ip_address?: string;
  description?: string;
  status: 'online' | 'offline' | 'unknown';
}

export const WidgetManagementScreen: React.FC = () => {
  const toast = useToast();
  const { logout } = useAuth();

  const [widgets, setWidgets] = useState<WidgetDisplayItem[]>([]);
  const [availableHosts, setAvailableHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHostSelector, setShowHostSelector] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<number | null>(null);
  const [configType, setConfigType] = useState<'server' | 'publicHost' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    widgetId?: number;
    hostName?: string;
  }>({ visible: false });

  const loadData = useCallback(async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) setIsLoading(true);

      // Get widget configurations
      console.log('[WidgetManagement] Loading widget configurations...');
      const { activeWidgets, unconfiguredWidgetIds } = await getConfiguredWidgets();
      console.log('[WidgetManagement] Active widgets:', activeWidgets.length);

      const unconfiguredItems: WidgetDisplayItem[] = (unconfiguredWidgetIds || []).map(id => ({
        widgetId: id,
        hostName: 'New Widget',
        macAddress: 'Tap "Configure" to set up',
        configType: 'server', // Default value
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        isUnconfigured: true,
      } as WidgetDisplayItem));

      setWidgets([...activeWidgets, ...unconfiguredItems]);

      // Get configuration type
      const type = await storage.getConfigType();
      console.log('[WidgetManagement] Config type:', type);
      setConfigType(type);

      // Load available hosts based on configuration
      if (type === 'server') {
        const serverConfig = await storage.getServerConfig();
        if (serverConfig?.isLoggedIn) {
          try {
            const hosts = await apiClient.getHosts();
            setAvailableHosts(hosts);
          } catch (error) {
            if (error instanceof SessionExpiredError) {
              toast.showError('Session expired. Please login again.');
              setTimeout(() => logout(), 1500);
            } else {
              console.error('[WidgetManagement] Failed to load hosts:', error);
            }
          }
        }
      } else if (type === 'publicHost') {
        const publicConfig = await storage.getPublicHostConfig();
        if (publicConfig) {
          // For public host, we only have one host
          setAvailableHosts([{
            id: 0,
            host_id: 0,
            name: publicConfig.hostName || 'Public Host',
            mac_address: '', // Will be fetched when configuring
            status: 'unknown',
          }]);
        }
      }
    } catch (error: any) {
      console.error('[WidgetManagement] Error loading data:', error);
      toast.showError(error.message || 'Failed to load widget data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [configType, logout, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  const handleAddWidget = async () => {
    if (configType === null) {
      Alert.alert(
        'Configuration Required',
        'Please configure a WOL-Manager server or public host in the Setup screen first.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (availableHosts.length === 0) {
      Alert.alert(
        'No Hosts Available',
        'There are no hosts available to add to a widget. Please add hosts in the app first.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Request to pin a new widget
      const success = await widgetModule.requestPinWidget();
      if (success) {
        toast.showSuccess('Widget added! Please select a host to configure it.');
        // Reload to get the new widget ID
        setTimeout(() => loadData(false), 1000);
      }
    } catch (error: any) {
      if (error.code === 'UNSUPPORTED') {
        Alert.alert(
          'Not Supported',
          'Widget pinning is not supported on your device. Please add the widget manually from your home screen.',
          [{ text: 'OK' }]
        );
      } else {
        toast.showError(error.message || 'Failed to add widget');
      }
    }
  };

  const handleConfigureWidget = (widgetId: number) => {
    setSelectedWidgetId(widgetId);
    setShowHostSelector(true);
  };

  const handleSelectHost = async (host: Host) => {
    if (selectedWidgetId === null) return;

    try {
      setShowHostSelector(false);

      if (configType === 'server') {
        const serverConfig = await storage.getServerConfig();
        if (!serverConfig) {
          toast.showError('Server configuration not found');
          return;
        }

        await configureWidgetForServerHost(
          selectedWidgetId,
          {
            id: host.host_id,
            name: host.name,
            mac_address: host.mac_address,
            ip_address: host.ip_address,
            status: host.status,
          },
          serverConfig.serverUrl,
          {
            cookies: apiClient.getCookies() || '',
            csrfToken: apiClient.getCsrfTokenValue() || '',
          }
        );

        toast.showSuccess(`Widget configured for ${host.name}`);
      } else if (configType === 'publicHost') {
        const publicConfig = await storage.getPublicHostConfig();
        if (!publicConfig) {
          toast.showError('Public host configuration not found');
          return;
        }

        // For public host, we need to fetch the actual MAC address
        try {
          const hostDetails = await apiClient.getPublicHostDetails(
            publicConfig.serverBaseUrl,
            publicConfig.token
          );

          await configureWidgetForPublicHost(selectedWidgetId, {
            hostName: hostDetails.name,
            macAddress: hostDetails.mac_address,
            publicHostUrl: publicConfig.publicHostUrl,
            token: publicConfig.token,
            serverBaseUrl: publicConfig.serverBaseUrl,
            status: hostDetails.status,
          });

          toast.showSuccess(`Widget configured for ${hostDetails.name}`);
        } catch (error) {
          toast.showError('Failed to fetch public host details');
          console.error(error);
        }
      }

      loadData(false);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to configure widget');
      console.error('[WidgetManagement] Configure widget error:', error);
    } finally {
      setSelectedWidgetId(null);
    }
  };

  const handleDeleteWidget = (widgetId: number, hostName?: string) => {
    setDeleteConfirm({
      visible: true,
      widgetId,
      hostName,
    });
  };

  const confirmDeleteWidget = async () => {
    const { widgetId, hostName } = deleteConfirm;
    if (!widgetId) return;

    setDeleteConfirm({ visible: false });

    try {
      await widgetModule.deleteWidget(widgetId);
      toast.showSuccess(
        `Widget configuration for ${hostName || 'host'} removed`
      );
      loadData(false);
    } catch (error: any) {
      toast.showError(error.message || 'Failed to delete widget configuration');
      console.error('[WidgetManagement] Delete widget error:', error);
    }
  };

  const handleCleanupOrphaned = async () => {
    try {
      const count = await cleanupOrphanedWidgetConfigs();
      if (count > 0) {
        toast.showSuccess(`Cleaned up ${count} orphaned widget configuration(s)`);
        loadData(false);
      } else {
        toast.showInfo('No orphaned configurations found');
      }
    } catch (error: any) {
      toast.showError('Failed to cleanup orphaned configurations');
      console.error(error);
    }
  };

  const renderWidgetCard = ({ item }: { item: WidgetDisplayItem }) => (
    <Card style={styles.widgetCard}>
      <View style={styles.widgetHeader}>
        <View style={styles.widgetInfo}>
          <Text style={styles.widgetHostName}>
            {item.isUnconfigured ? 'Unconfigured Widget' : item.hostName}
          </Text>
          <Text style={styles.widgetMacAddress}>
            {item.isUnconfigured ? 'Tap Configure to select host' : item.macAddress}
          </Text>
          {!item.isUnconfigured && item.ipAddress && (
            <Text style={styles.widgetIpAddress}>IP: {item.ipAddress}</Text>
          )}
        </View>
        {!item.isUnconfigured && (
          <View style={styles.widgetTypeBadge}>
            <Text style={styles.widgetTypeText}>
              {item.configType === 'server' ? 'Server' : 'Public'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.widgetActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.reconfigureButton]}
          onPress={() => handleConfigureWidget(item.widgetId)}
        >
          <Text style={styles.reconfigureButtonText}>
            {item.isUnconfigured ? 'Configure' : 'Reconfigure'}
          </Text>
        </TouchableOpacity>

        {!item.isUnconfigured && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteWidget(item.widgetId, item.hostName)}
          >
            <Text style={styles.deleteButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  const renderHostSelector = () => {
    if (!showHostSelector) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Host for Widget</Text>
          
          <ScrollView style={styles.hostList}>
            {availableHosts.map((host) => (
              <TouchableOpacity
                key={host.host_id}
                style={styles.hostItem}
                onPress={() => handleSelectHost(host)}
              >
                <View style={styles.hostItemInfo}>
                  <Text style={styles.hostItemName}>{host.name}</Text>
                  {host.mac_address && (
                    <Text style={styles.hostItemMac}>{host.mac_address}</Text>
                  )}
                </View>
                {host.status && <StatusBadge status={host.status} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Button
            title="Cancel"
            onPress={() => {
              setShowHostSelector(false);
              setSelectedWidgetId(null);
            }}
            style={styles.cancelButton}
          />
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading widgets...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfirmDialog
        visible={deleteConfirm.visible}
        title="Remove Widget Configuration"
        message={`Remove widget configuration for ${deleteConfirm.hostName || 'this host'}? The widget will remain on your home screen but won't work until reconfigured.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmDeleteWidget}
        onCancel={() => setDeleteConfirm({ visible: false })}
      />

      {renderHostSelector()}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Widget Management</Text>
        <Text style={styles.headerSubtitle}>
          Manage your Wake-on-LAN widgets
        </Text>
      </View>

      {widgets.length === 0 ? (
        <EmptyState
          title="No Widgets on Homescreen"
          description="To use widgets, first add a WOL widget to your home screen:\n\n1. Long-press on your home screen\n2. Tap 'Widgets'\n3. Find 'WOLManagerReact'\n4. Drag the widget to your home screen\n5. Come back here to configure it\n\nNote: You must first place a widget on your home screen before you can configure it here."
          action={{
            label: 'Instructions Added',
            onPress: () => toast.showInfo('Please add a widget from your home screen first!'),
          }}
        />
      ) : (
        <FlatList
          data={widgets}
          renderItem={renderWidgetCard}
          keyExtractor={(item) => item.widgetId.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary.main}
              colors={[Colors.primary.main]}
            />
          }
        />
      )}

      <View style={styles.footer}>
        <Button
          title="Cleanup Orphaned Configs"
          onPress={handleCleanupOrphaned}
          style={styles.cleanupButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  widgetCard: {
    marginBottom: Spacing.md,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  widgetInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  widgetHostName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  widgetMacAddress: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.xs / 2,
  },
  widgetIpAddress: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
  },
  widgetTypeBadge: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
  },
  widgetTypeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.medium,
  },
  widgetActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reconfigureButton: {
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  reconfigureButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primary.main,
    fontFamily: Typography.fontFamily.medium,
  },
  deleteButton: {
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  deleteButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.error.main,
    fontFamily: Typography.fontFamily.medium,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  cleanupButton: {
    backgroundColor: Colors.background.secondary,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxHeight: '70%',
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  hostList: {
    maxHeight: 400,
  },
  hostItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  hostItemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  hostItemName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs / 2,
  },
  hostItemMac: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
  },
  cancelButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.background.tertiary,
  },
});
