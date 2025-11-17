import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootStackParamList, PublicHost } from '../types';
import { apiClient } from '../api/client';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { useToast } from '../context/ToastContext';
import { Card, StatusBadge } from '../components/UI';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { storage } from '../utils/storage';

type PublicHostScreenRouteProp = RouteProp<RootStackParamList, 'PublicHost'>;
type PublicHostScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PublicHost'
>;

interface Props {
  route: PublicHostScreenRouteProp;
  navigation: PublicHostScreenNavigationProp;
}

export const PublicHostScreen: React.FC<Props> = ({ route, navigation }) => {
  const { publicHostConfig } = route.params;
  const toast = useToast();
  
  const [host, setHost] = useState<PublicHost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWaking, setIsWaking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wakeConfirm, setWakeConfirm] = useState({ visible: false, hostName: '' });
  const [removeConfirm, setRemoveConfirm] = useState(false);
  
  // Animation for wake button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fetch host status
  const fetchHostStatus = useCallback(async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setIsLoading(true);
      }
      setError(null);

      const statusData = await apiClient.getPublicHostStatus(
        publicHostConfig.serverBaseUrl,
        publicHostConfig.token
      );

      // Set basic host info from status endpoint
      setHost({
        id: statusData.host_id,
        name: statusData.name,
        mac_address: '', // Not available from status endpoint
        description: undefined, // Not available from status endpoint
        status: statusData.status,
        last_check: statusData.last_check,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load host information');
      toast.showError(err.message || 'Failed to load host', 'Error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [publicHostConfig, toast]);

  // Initial load
  useEffect(() => {
    fetchHostStatus();
  }, [fetchHostStatus]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isWaking && !isLoading) {
        fetchHostStatus(false);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchHostStatus, isWaking, isLoading]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchHostStatus(false);
  }, [fetchHostStatus]);
  
  // Pulse animation when waking
  useEffect(() => {
    if (isWaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isWaking, pulseAnim]);

  // Wake host - performWake function
  const performWake = useCallback(async () => {
    if (!host) return;

    setIsWaking(true);
    try {
      const success = await apiClient.wakePublicHost(
        publicHostConfig.serverBaseUrl,
        publicHostConfig.token,
        host.id
      );

      if (success) {
        toast.showSuccess('Magic packet sent successfully', 'Wake Sent');
        
        // Start polling for status changes
        setTimeout(() => {
          fetchHostStatus(false);
        }, 2000);
      }
    } catch (err: any) {
      toast.showError(err.message || 'Failed to wake host', 'Wake Failed');
    } finally {
      setIsWaking(false);
    }
  }, [host, publicHostConfig, toast, fetchHostStatus]);

  // Handle wake with confirmation
  const handleWakeHost = useCallback(() => {
    if (!host) return;

    // Show confirmation if host is already online
    if (host.status === 'online') {
      setWakeConfirm({
        visible: true,
        hostName: host.name,
      });
      return;
    }

    performWake();
  }, [host, performWake]);
  
  // Confirm wake for online host
  const confirmWakeHost = useCallback(() => {
    setWakeConfirm({ visible: false, hostName: '' });
    performWake();
  }, [performWake]);
  
  // Handle reset configuration
  const handleResetConfig = useCallback(() => {
    setRemoveConfirm(true);
  }, []);
  
  // Confirm reset configuration
  const confirmResetConfig = useCallback(async () => {
    setRemoveConfirm(false);
    try {
      await storage.clearPublicHostConfig();
      toast.showSuccess('Public host removed successfully');
      // Force app restart by clearing config - navigation will handle showing setup
      // The AppNavigator will detect no config and show setup screen
    } catch (error: any) {
      toast.showError('Failed to remove public host', 'Error');
    }
  }, [toast]);

  // Format last check time
  const formatLastCheck = (lastCheck?: string) => {
    if (!lastCheck) return 'Never';
    try {
      const date = new Date(lastCheck);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading && !host) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>Loading host information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !host) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchHostStatus()}
          >
            <LinearGradient
              colors={Colors.primary.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Wake Confirmation Dialog */}
      <ConfirmDialog
        visible={wakeConfirm.visible}
        title="Host Already Online"
        message={`${wakeConfirm.hostName} appears to be already online. Do you still want to send a wake-up packet?`}
        confirmText="Wake Anyway"
        cancelText="Cancel"
        confirmColor={Colors.primary.main}
        onConfirm={confirmWakeHost}
        onCancel={() => setWakeConfirm({ visible: false, hostName: '' })}
      />
      
      {/* Remove Configuration Dialog */}
      <ConfirmDialog
        visible={removeConfirm}
        title="Remove Public Host"
        message="Are you sure you want to remove this public host? You will need to scan the QR code again to access it."
        confirmText="Remove"
        cancelText="Cancel"
        confirmColor={Colors.error.main}
        onConfirm={confirmResetConfig}
        onCancel={() => setRemoveConfirm(false)}
      />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary.main}
            colors={[Colors.primary.main]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerSubtitle}>Public Access</Text>
              <Text style={styles.headerTitle}>{host?.name || 'Loading...'}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleResetConfig}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Host Card */}
        <Card style={styles.hostCard}>
          <View style={styles.hostHeader}>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>{host?.name || 'Host'}</Text>
              {host?.description && (
                <Text style={styles.hostDescription}>{host.description}</Text>
              )}
            </View>
            <StatusBadge status={host?.status || 'unknown'} />
          </View>

          {/* Host Details */}
          {host?.mac_address && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>MAC:</Text>
              <Text style={styles.detailValue}>{host.mac_address}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Check:</Text>
            <Text style={styles.detailValue}>{formatLastCheck(host?.last_check)}</Text>
          </View>

          {/* Wake Button */}
          <Animated.View style={[{ transform: [{ scale: isWaking ? pulseAnim : 1 }] }, styles.wakeButtonWrapper]}>
            <TouchableOpacity
              style={[
                styles.wakeButton,
                (host?.status === 'online' || isWaking) && styles.disabledButton,
              ]}
              onPress={handleWakeHost}
              disabled={host?.status === 'online' || isWaking}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  host?.status === 'online'
                    ? [Colors.text.disabled, Colors.text.disabled]
                    : isWaking
                    ? [Colors.warning.main, Colors.warning.light]
                    : Colors.primary.gradient
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.wakeButtonGradient}
              >
                <Text style={styles.wakeButtonText}>
                  {host?.status === 'online' ? 'Online' : isWaking ? 'Waking...' : 'Wake Host'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by WOL Manager</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  // Center states
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
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
    height: 44,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minWidth: 120,
    ...Shadows.md,
  },
  retryButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.medium,
  },

  // Header
  header: {
    marginBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  settingsButton: {
    padding: Spacing.sm,
    marginTop: -Spacing.xs,
  },

  // Host Card
  hostCard: {
    marginBottom: Spacing.lg,
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
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.medium,
    width: 90,
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
    flex: 1,
  },

  // Wake Button
  wakeButtonWrapper: {
    marginTop: Spacing.md,
  },
  wakeButton: {
    height: 50,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  wakeButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wakeButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
  },
});
