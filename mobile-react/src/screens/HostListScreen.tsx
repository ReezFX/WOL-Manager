import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { GlassCard, StatusBadge, EmptyState, Button } from '../components/UI';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { apiClient, SessionExpiredError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
  navigation: any;
}

interface HostCardProps {
  item: HostWithStatus;
  index: number;
  isWaking: boolean;
  onWake: (id: number, name?: string) => void;
  onDelete: (id: number, name?: string) => void;
}

const FadeInView = ({ index, children }: { index: number; children: React.ReactNode }) => {
  const anim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 100, // Stagger effect
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY }],
      }}
    >
      {children}
    </Animated.View>
  );
};

const HostCard = React.memo(({ item, index, isWaking, onWake, onDelete }: HostCardProps) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isWaking) {
      // Start pulse animation
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
  }, [isWaking]);

    const onlineGradient = item.status === 'online' 
      ? ['rgba(40, 180, 133, 0.15)', 'rgba(40, 180, 133, 0.05)']
      : [Colors.background.secondary, 'rgba(36, 36, 38, 0.4)'];

    const borderColor = item.status === 'online' 
      ? Colors.success.main + '40' 
      : Colors.border.light + '40';

    return (
      <FadeInView index={index}>
        <View>
          <GlassCard style={[styles.hostCard, { borderColor }]}>
          <LinearGradient
            colors={onlineGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        <View style={styles.cardContent}>
          <View style={styles.hostHeader}>
            <View style={styles.iconBox}>
              <Ionicons 
                name={item.status === 'online' ? 'desktop' : 'desktop-outline'} 
                size={24} 
                color={item.status === 'online' ? Colors.primary.main : Colors.text.tertiary} 
              />
            </View>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>{item.name || `Host ${item.host_id}`}</Text>
              {item.description && (
                <Text style={styles.hostDescription} numberOfLines={1}>{item.description}</Text>
              )}
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View style={styles.hostDetails}>
            {item.mac_address && (
              <View style={styles.detailBadge}>
                <Ionicons name="hardware-chip-outline" size={12} color={Colors.text.tertiary} style={styles.detailIcon} />
                <Text style={styles.detailValue}>{item.mac_address}</Text>
              </View>
            )}
            {item.ip_address && (
              <View style={styles.detailBadge}>
                 <Ionicons name="globe-outline" size={12} color={Colors.text.tertiary} style={styles.detailIcon} />
                <Text style={styles.detailValue}>{item.ip_address}</Text>
              </View>
            )}
          </View>

          <View style={styles.hostActions}>
            <Animated.View style={[{ transform: [{ scale: isWaking ? pulseAnim : 1 }], flex: 1 }]}>
              <TouchableOpacity
                style={[
                  styles.wakeButton,
                  (item.status === 'online' || isWaking) && styles.disabledButton,
                ]}
                onPress={() => onWake(item.host_id, item.name)}
                disabled={item.status === 'online' || isWaking}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    item.status === 'online'
                      ? [Colors.background.tertiary, Colors.background.tertiary]
                      : isWaking
                      ? [Colors.warning.main, Colors.warning.light]
                      : Colors.primary.gradient
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons 
                    name={item.status === 'online' ? 'power' : 'power'} 
                    size={18} 
                    color={item.status === 'online' ? Colors.text.disabled : Colors.text.inverse}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[
                    styles.actionButtonText,
                    item.status === 'online' && { color: Colors.text.disabled }
                  ]}>
                    {item.status === 'online' ? 'Running' : isWaking ? 'Waking...' : 'Wake Up'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => onDelete(item.host_id, item.name)}
              activeOpacity={0.4}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    </View>
    </FadeInView>
  );
});

export const HostListScreen: React.FC<HostListScreenProps> = ({ route, navigation }) => {
  const { logout, serverConfig } = useAuth();
  const toast = useToast();
  
  // All state declarations
  const [hosts, setHosts] = useState<HostWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    hostId?: number;
    hostName?: string;
  }>({ visible: false });
  const [wakeConfirm, setWakeConfirm] = useState<{
    visible: boolean;
    hostId?: number;
    hostName?: string;
  }>({ visible: false });
  const [wakingHost, setWakingHost] = useState<number | null>(null);
  
  // All refs
  const statusCheckIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchHosts = useCallback(async (showLoading = true) => {
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
  }, [logout]);

  useEffect(() => {
    fetchHosts();
    
    // Cleanup interval on unmount
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, [fetchHosts]);

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

  const showWakeConfirm = useCallback((hostId: number, hostName?: string) => {
    setWakeConfirm({
      visible: true,
      hostId,
      hostName,
    });
  }, []);

  const handleWakeHost = async () => {
    const { hostId, hostName } = wakeConfirm;
    if (!hostId) return;

    setWakeConfirm({ visible: false });
    setWakingHost(hostId);

    try {
      await apiClient.wakeHost(hostId);
      
      toast.showSuccess(
        `Wake-on-LAN packet sent to ${hostName || `Host ${hostId}`}`
      );

      // Clear any existing interval
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      
      // Start monitoring host status
      const startTime = Date.now();
      const maxDuration = 60000; // 60 seconds
      
      statusCheckIntervalRef.current = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        
        // Stop after 60 seconds
        if (elapsed >= maxDuration) {
          if (statusCheckIntervalRef.current) {
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
          }
          setWakingHost(null);
          toast.showInfo(`Wake timeout for ${hostName || `Host ${hostId}`}`);
          return;
        }
        
        // Check host status
        try {
          const hosts = await apiClient.getHosts();
          const host = hosts.find(h => h.host_id === hostId);
          
          if (host?.status === 'online') {
            if (statusCheckIntervalRef.current) {
              clearInterval(statusCheckIntervalRef.current);
              statusCheckIntervalRef.current = null;
            }
            setWakingHost(null);
            fetchHosts(false);
            toast.showSuccess(`${hostName || `Host ${hostId}`} is now online!`);
          }
        } catch (error) {
          // Continue checking even if one request fails
          console.log('[HostList] Status check failed, continuing...');
        }
      }, 3000) as unknown as NodeJS.Timeout; // Check every 3 seconds
      
    } catch (error: any) {
      console.error('[HostList] Error waking host:', error);
      setWakingHost(null);
      
      if (error instanceof SessionExpiredError) {
        toast.showError('Your session has expired. Please login again.');
        setTimeout(() => logout(), 1500);
        return;
      }

      toast.showError(
        error.message || `Failed to wake ${hostName || `Host ${hostId}`}`
      );
    }
  };

  const handleDeleteHost = useCallback((hostId: number, hostName?: string) => {
    setDeleteConfirm({
      visible: true,
      hostId,
      hostName,
    });
  }, []);

  const confirmDeleteHost = async () => {
    const { hostId, hostName } = deleteConfirm;
    if (!hostId) return;

    setDeleteConfirm({ visible: false });

    try {
      const ok = await apiClient.deleteHost(hostId);
      if (ok) {
        // Optimistic update: remove locally
        setHosts(prev => prev.filter(h => h.host_id !== hostId));
        // Also refresh from server in background
        fetchHosts(false);
        console.log('[HostList] Host deleted successfully');
        toast.showSuccess(
          `${hostName || `Host ${hostId}`} deleted successfully`
        );
      }
    } catch (error: any) {
      console.error('[HostList] Error deleting host:', error);
      
      if (error instanceof SessionExpiredError) {
        toast.showError('Your session has expired. Please login again.');
        setTimeout(() => logout(), 1500);
        return;
      }
      
      toast.showError(
        error.message || 'Failed to delete host'
      );
    }
  };

  // Header Component
  const DashboardHeader = () => {
    const onlineCount = hosts.filter(h => h.status === 'online').length;
    const totalCount = hosts.length;
    const username = serverConfig?.username || 'User';
    
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerGreeting}>Hello, <Text style={styles.headerUsername}>{username}</Text></Text>
            <Text style={styles.headerSubtitle}>Manage your network devices</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
             <LinearGradient
                colors={[Colors.primary.main, Colors.primary.dark]}
                style={styles.profileAvatar}
             >
                <Text style={styles.profileInitials}>{username.charAt(0).toUpperCase()}</Text>
             </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsContainer}>
          {/* Online Status Card */}
          <GlassCard style={[styles.statsCard, styles.statsCardOnline]}>
             <LinearGradient
              colors={['rgba(40, 180, 133, 0.2)', 'rgba(40, 180, 133, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.statContent}>
              <View style={[styles.statIconBox, { backgroundColor: 'rgba(40, 180, 133, 0.2)' }]}>
                <Ionicons name="wifi" size={20} color={Colors.success.main} />
              </View>
              <View>
                <Text style={styles.statValue}>{onlineCount}</Text>
                <Text style={styles.statLabel}>Online</Text>
              </View>
            </View>
          </GlassCard>

          {/* Total Hosts Card */}
          <GlassCard style={[styles.statsCard, styles.statsCardTotal]}>
             <LinearGradient
              colors={['rgba(23, 162, 184, 0.2)', 'rgba(23, 162, 184, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.statContent}>
               <View style={[styles.statIconBox, { backgroundColor: 'rgba(23, 162, 184, 0.2)' }]}>
                <Ionicons name="server-outline" size={20} color={Colors.primary.main} />
              </View>
              <View>
                <Text style={styles.statValue}>{totalCount}</Text>
                <Text style={styles.statLabel}>Total Hosts</Text>
              </View>
            </View>
          </GlassCard>
        </View>
      </View>
    );
  };

  const renderHostCard = useCallback(({ item, index }: { item: HostWithStatus; index: number }) => {
    return (
      <HostCard
        item={item}
        index={index}
        isWaking={wakingHost === item.host_id}
        onWake={showWakeConfirm}
        onDelete={handleDeleteHost}
      />
    );
  }, [wakingHost, showWakeConfirm, handleDeleteHost]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading hosts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteConfirm.visible}
        title="Delete Host"
        message={`Are you sure you want to delete ${deleteConfirm.hostName || `Host ${deleteConfirm.hostId}`}?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteHost}
        onCancel={() => setDeleteConfirm({ visible: false })}
      />

      {/* Wake Confirmation Dialog */}
      <ConfirmDialog
        visible={wakeConfirm.visible}
        title="Wake Host"
        message={`Send Wake-on-LAN packet to ${wakeConfirm.hostName || `Host ${wakeConfirm.hostId}`}?`}
        confirmText="Wake"
        cancelText="Cancel"
        confirmColor={Colors.primary.main}
        onConfirm={handleWakeHost}
        onCancel={() => setWakeConfirm({ visible: false })}
      />

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
      ) : (
        <FlatList
          data={hosts}
          renderItem={renderHostCard}
          keyExtractor={(item) => item.host_id.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={hosts.length > 0 ? <DashboardHeader /> : null}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                title="No Hosts"
                description="You haven't added any hosts yet. Add a new host to get started."
                action={{
                  label: 'Add Host',
                  onPress: () => {
                     Alert.alert('Info', 'Add host functionality coming soon!');
                  },
                }}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary.main}
              colors={[Colors.primary.main]}
              progressViewOffset={40}
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

  // Header
  headerContainer: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerGreeting: {
    fontSize: Typography.fontSize['2xl'], // Slightly smaller but elegant
    fontWeight: Typography.fontWeight.regular,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: 4,
  },
  headerUsername: {
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
  },
  profileButton: {
    ...Shadows.md,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.light + '40',
  },
  profileInitials: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statsCard: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 32,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
  },
  statsCardOnline: {
    borderColor: Colors.success.main + '30',
  },
  statsCardTotal: {
    borderColor: Colors.primary.main + '30',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    lineHeight: 28,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.medium,
  },
  // Removed old stat styles
  statItem: { display: 'none' },
  statDivider: { display: 'none' },
  statDot: { display: 'none' },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120, // Space for FAB + bottom tab
  },

  // Host Card
  hostCard: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.border.light + '40', // Subtle border
  },
  cardContent: {
    position: 'relative',
    zIndex: 1,
  },
  hostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light + '20',
  },
  hostInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  hostName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  hostDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
  },

  // Details
  hostDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.light + '10',
  },
  detailIcon: {
    marginRight: 6,
  },
  detailValue: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.medium,
  },

  // Actions
  hostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 24,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
  wakeButton: {
    flex: 1,
    height: 44,
    borderRadius: 24,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  disabledButton: {
    opacity: 0.8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  deleteButtonText: {
    display: 'none', // Hidden since we use icon only now
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
