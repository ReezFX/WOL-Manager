import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Card, StatusBadge, EmptyState, Button } from '../components/UI';
import { apiClient, SessionExpiredError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { HostStatus } from '../types';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  GlassEffect,
  IconSize,
  Layout,
} from '../constants/theme';

interface HostWithStatus extends HostStatus {
  name?: string;
  mac_address?: string;
  ip_address?: string;
  description?: string;
}

interface HostListScreenProps {
  route?: any;
}

export const HostListScreen: React.FC<HostListScreenProps> = ({ route }) => {
  const { logout } = useAuth();
  const [hosts, setHosts] = useState<HostWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchHosts = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError('');

      // Get all hosts with complete data from backend
      const hosts = await apiClient.getHosts();
      
      // Map to expected format
      const hostsWithData: HostWithStatus[] = hosts.map((host) => ({
        host_id: host.host_id,
        name: host.name,
        mac_address: host.mac_address,
        ip_address: host.ip,
        ip: host.ip,
        description: host.description,
        status: host.status,
        last_check: host.last_check,
      }));

      setHosts(hostsWithData);
    } catch (error: any) {
      console.error('[HostList] Error fetching hosts:', error);
      
      if (error instanceof SessionExpiredError) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => logout(),
            },
          ]
        );
        return;
      }
      
      setError(error.message || 'Failed to load hosts');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  // Refresh when navigating back with refresh parameter
  useEffect(() => {
    if (route?.params?.refresh) {
      console.log('[HostList] Refresh triggered by navigation');
      fetchHosts(false);
    }
  }, [route?.params?.refresh]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchHosts(false);
  };

  const handleWakeHost = async (hostId: number, hostName?: string) => {
    try {
      await apiClient.wakeHost(hostId);
      
      Alert.alert(
        'Success',
        `Wake-on-LAN packet sent to ${hostName || `Host ${hostId}`}`,
        [{ text: 'OK' }]
      );

      // Refresh host list to update status
      setTimeout(() => fetchHosts(false), 2000);
    } catch (error: any) {
      console.error('[HostList] Error waking host:', error);
      
      if (error instanceof SessionExpiredError) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => logout(),
            },
          ]
        );
        return;
      }

      Alert.alert(
        'Error',
        error.message || `Failed to wake ${hostName || `Host ${hostId}`}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeleteHost = (hostId: number, hostName?: string) => {
    Alert.alert(
      'Delete Host',
      `Are you sure you want to delete ${hostName || `Host ${hostId}`}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const ok = await apiClient.deleteHost(hostId);
              if (ok) {
                // Optimistic update: remove locally
                setHosts(prev => prev.filter(h => h.host_id !== hostId));
                // Also refresh from server in background
                fetchHosts(false);
                console.log('[HostList] Host deleted successfully');
              }
            } catch (error: any) {
              console.error('[HostList] Error deleting host:', error);
              
              if (error instanceof SessionExpiredError) {
                // Use setTimeout to avoid nested alert issues
                setTimeout(() => {
                  Alert.alert(
                    'Session Expired',
                    'Your session has expired. Please login again.',
                    [
                      {
                        text: 'OK',
                        onPress: () => logout(),
                      },
                    ]
                  );
                }, 100);
                return;
              }
              
              // Show error after a short delay to avoid nested alerts
              setTimeout(() => {
                Alert.alert(
                  'Error',
                  error.message || 'Failed to delete host',
                  [{ text: 'OK' }]
                );
              }, 100);
            }
          },
        },
      ]
    );
  };

  const renderHostCard = ({ item }: { item: HostWithStatus }) => {
    return (
      <Card style={styles.hostCard}>
        <View style={styles.hostHeader}>
          <View style={styles.hostInfo}>
            <Text style={styles.hostName}>{item.name || `Host ${item.host_id}`}</Text>
            {item.description && (
              <Text style={styles.hostDescription}>{item.description}</Text>
            )}
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.hostDetails}>
          {item.mac_address && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>MAC:</Text>
              <Text style={styles.detailValue}>{item.mac_address}</Text>
            </View>
          )}
          {item.ip_address && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>IP:</Text>
              <Text style={styles.detailValue}>{item.ip_address}</Text>
            </View>
          )}
        </View>

        <View style={styles.hostActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.wakeButton,
              item.status === 'online' && styles.disabledButton,
            ]}
            onPress={() => handleWakeHost(item.host_id, item.name)}
            disabled={item.status === 'online'}
          >
            <LinearGradient
              colors={
                item.status === 'online'
                  ? [Colors.text.disabled, Colors.text.disabled]
                  : Colors.primary.gradient
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>
                {item.status === 'online' ? 'Online' : 'Wake'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteHost(item.host_id, item.name)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading hosts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Host List */}
      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Retry"
            onPress={() => fetchHosts()}
            style={styles.retryButton}
          />
        </View>
      ) : hosts.length === 0 ? (
        <EmptyState
          title="No Hosts"
          description="You haven't added any hosts yet. Add a new host to get started."
          action={{
            label: 'Add Host',
            onPress: () => {
              // TODO: Navigate to add host screen
              Alert.alert('Info', 'Add host functionality coming soon!');
            },
          }}
        />
      ) : (
        <FlatList
          data={hosts}
          renderItem={renderHostCard}
          keyExtractor={(item) => item.host_id.toString()}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 120, // Space for FAB + bottom tab
  },

  // Host Card
  hostCard: {
    marginBottom: Spacing.md,
  },
  hostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  hostInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  hostName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  hostDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
  },

  // Details
  hostDetails: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detailLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.medium,
    width: 60,
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
    flex: 1,
  },

  // Actions
  hostActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.medium,
  },
  wakeButton: {
    ...Shadows.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  deleteButton: {
    backgroundColor: Colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  deleteButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.error.main,
    fontFamily: Typography.fontFamily.medium,
  },

  // Center Container
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
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.error.main,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
});
