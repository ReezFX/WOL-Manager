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
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
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
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>WOL Manager</Text>
          <Text style={styles.headerSubtitle}>Manage your hosts</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <View style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </View>
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
            {/* Welcome Card */}
            <GlassCard style={styles.welcomeCard}>
              <LinearGradient
                colors={[Colors.gradientStart.cardHeader, Colors.gradientEnd.cardHeader]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.welcomeGradient}
              >
                <Text style={styles.welcomeEmoji}>🖥️</Text>
                <Text style={styles.welcomeTitle}>Dashboard</Text>
                <Text style={styles.welcomeSubtitle}>Monitor and control your devices</Text>
              </LinearGradient>
            </GlassCard>

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

            <Text style={styles.sectionTitle}>Hosts ({totalHosts})</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface.light,
    borderBottomWidth: 1,
    borderBottomColor: Colors.text.secondary + '20',
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  logoutButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutText: {
    ...Typography.bodyBold,
    color: Colors.danger,
  },
  listContent: {
    padding: Spacing.lg,
  },
  welcomeCard: {
    marginBottom: Spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  welcomeTitle: {
    ...Typography.h2,
    color: Colors.text.light,
    fontWeight: '700',
  },
  welcomeSubtitle: {
    ...Typography.body,
    color: Colors.text.light,
    opacity: 0.9,
  },
  statisticsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statisticCard: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
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
