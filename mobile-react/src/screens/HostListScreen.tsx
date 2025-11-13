import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';
import { HostCard, LoadingScreen, StatisticCard, GlassCard } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { apiClient, SessionExpiredError } from '../api/client';
import { HostStatus } from '../types';

export const HostListScreen: React.FC = () => {
  const { logout } = useAuth();
  const [hosts, setHosts] = useState<HostStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wakingHostId, setWakingHostId] = useState<number | null>(null);

  const loadHosts = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      
      const hostStatuses = await apiClient.getHostStatuses();
      setHosts(hostStatuses);
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        Alert.alert('Session Expired', 'Please login again.', [
          { text: 'OK', onPress: () => logout() },
        ]);
      } else {
        Alert.alert('Error', `Failed to load hosts: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleWakeHost = async (hostId: number) => {
    try {
      setWakingHostId(hostId);
      await apiClient.wakeHost(hostId);
      Alert.alert('Success', 'Wake-on-LAN packet sent!');
      
      // Refresh hosts after a short delay
      setTimeout(() => loadHosts(true), 2000);
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        Alert.alert('Session Expired', 'Please login again.', [
          { text: 'OK', onPress: () => logout() },
        ]);
      } else {
        Alert.alert('Error', `Failed to wake host: ${error.message}`);
      }
    } finally {
      setWakingHostId(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadHosts(true);
  };

  useEffect(() => {
    loadHosts();
  }, []);

  if (loading && !refreshing) {
    return <LoadingScreen />;
  }

  // Calculate statistics
  const totalHosts = hosts.length;
  const onlineHosts = hosts.filter(h => h.status.toLowerCase() === 'online').length;
  const offlineHosts = hosts.filter(h => h.status.toLowerCase() === 'offline').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Dashboard Header */}
      <View style={styles.dashboardHeader}>
        <View style={styles.dashboardHeaderContent}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>
          <Text style={styles.dashboardSubtitle}>Monitor and control your devices</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <LinearGradient
            colors={[Colors.gradientStart.dangerButton, Colors.gradientEnd.dangerButton]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoutGradient}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={hosts}
        keyExtractor={(item) => item.host_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Statistics Overview Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Text style={styles.sectionIcon}>📊</Text>
              </View>
              <Text style={styles.sectionTitle}>Statistics Overview</Text>
            </View>

            {/* Statistics */}
            <View style={styles.statisticsContainer}>
              <StatisticCard
                title="Total"
                value={totalHosts.toString()}
                iconGradient={[Colors.primary, Colors.secondary]}
                style={styles.statisticCard}
              />
              <StatisticCard
                title="Online"
                value={onlineHosts.toString()}
                iconGradient={[Colors.gradientStart.successButton, Colors.gradientEnd.successButton]}
                style={styles.statisticCard}
              />
              <StatisticCard
                title="Offline"
                value={offlineHosts.toString()}
                iconGradient={[Colors.gradientStart.dangerButton, Colors.gradientEnd.dangerButton]}
                style={styles.statisticCard}
              />
            </View>

            {/* Hosts Section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Text style={styles.sectionIcon}>🖥️</Text>
              </View>
              <Text style={styles.sectionTitle}>Hosts ({totalHosts})</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hosts configured</Text>
            <Text style={styles.emptySubtext}>
              Add hosts through the web interface
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <HostCard
            host={{
              id: item.host_id,
              name: item.name,
              mac_address: item.mac_address || 'N/A',
              ip: item.ip,
              status: item.status,
            }}
            onWake={handleWakeHost}
            waking={wakingHostId === item.host_id}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface.light,
    ...Shadows.sm,
  },
  dashboardHeaderContent: {
    flex: 1,
  },
  dashboardTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    fontWeight: '700',
    marginBottom: Spacing.xs / 2,
  },
  dashboardSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  logoutButton: {
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  logoutGradient: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  logoutText: {
    ...Typography.bodyBold,
    color: Colors.text.light,
  },
  listContent: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary + '30',
  },
  sectionIconContainer: {
    marginRight: Spacing.sm,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  statisticsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statisticCard: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    ...Typography.h3,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
});
