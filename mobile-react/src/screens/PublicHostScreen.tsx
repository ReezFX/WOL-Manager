import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, PublicHost } from '../types';
import { apiClient } from '../api/client';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
} from '../constants/theme';
import { useToast } from '../context/ToastContext';

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
  const handleWakeHost = useCallback(async () => {
    if (!host) return;

    // Show confirmation if host is already online
    if (host.status === 'online') {
      Alert.alert(
        'Host Already Online',
        'This host appears to be already online. Do you still want to send a wake-up packet?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Wake Anyway',
            style: 'default',
            onPress: () => performWake(),
          },
        ]
      );
      return;
    }

    performWake();
  }, [host, performWake]);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return Colors.success.main;
      case 'offline':
        return Colors.error.main;
      default:
        return Colors.text.secondary;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return '●';
      case 'offline':
        return '●';
      default:
        return '●';
    }
  };

  // Format last check time
  const formatLastCheck = (lastCheck?: string) => {
    if (!lastCheck) return 'Never';
    try {
      const date = new Date(lastCheck);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading && !host) {
    return (
      <LinearGradient colors={Colors.primary.gradient} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.text.inverse} />
            <Text style={styles.loadingText}>Loading host information...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error && !host) {
    return (
      <LinearGradient colors={Colors.primary.gradient} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchHostStatus()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.primary.gradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.text.inverse}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>Public Host</Text>
            <Text style={styles.headerTitle}>{host?.name || 'Loading...'}</Text>
          </View>

          {/* Host Card */}
          <View style={styles.card}>
            {/* Status Badge */}
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(host?.status || 'unknown') },
                ]}
              >
                <Text style={styles.statusIcon}>
                  {getStatusIcon(host?.status || 'unknown')}
                </Text>
                <Text style={styles.statusText}>
                  {(host?.status || 'unknown').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Host Information */}
            <View style={styles.infoSection}>
              {host?.mac_address && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Text style={styles.infoIcon}>🔌</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>MAC Address</Text>
                    <Text style={styles.infoValue}>{host.mac_address}</Text>
                  </View>
                </View>
              )}

              {host?.description && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue}>{host.description}</Text>
                  </View>
                </View>
              )}

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>🕐</Text>
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Last Check</Text>
                  <Text style={styles.infoValue}>
                    {formatLastCheck(host?.last_check)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Wake Button */}
            <View style={styles.wakeButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.wakeButton,
                  host?.status === 'online' && styles.wakeButtonOnline,
                  host?.status === 'offline' && styles.wakeButtonOffline,
                  isWaking && styles.wakeButtonDisabled,
                ]}
                onPress={handleWakeHost}
                disabled={isWaking}
                activeOpacity={0.8}
              >
                {isWaking ? (
                  <ActivityIndicator color={Colors.text.inverse} size="small" />
                ) : (
                  <>
                    <Text style={styles.wakeButtonIcon}>⚡</Text>
                    <Text style={styles.wakeButtonText}>Wake Host</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Powered by WOL Manager</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.regular,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    opacity: 0.9,
  },
  retryButton: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  retryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.main,
    fontFamily: Typography.fontFamily.medium,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.regular,
    opacity: 0.8,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },

  // Status
  statusContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusIcon: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.inverse,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.medium,
  },

  // Info Section
  infoSection: {
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.xs / 2,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.medium,
  },

  // Wake Button
  wakeButtonContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  wakeButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  wakeButtonOnline: {
    backgroundColor: Colors.success.main,
  },
  wakeButtonOffline: {
    backgroundColor: Colors.error.main,
  },
  wakeButtonDisabled: {
    opacity: 0.6,
  },
  wakeButtonIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  wakeButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.bold,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.regular,
    opacity: 0.7,
  },
});
