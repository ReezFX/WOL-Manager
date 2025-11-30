import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Card } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import {
  Colors,
  Typography,
  Spacing,
  Shadows,
} from '../constants/theme';

interface AdminMenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  onPress: () => void;
  isImplemented: boolean;
}

export const AdminScreen: React.FC = () => {
  const { serverConfig } = useAuth();
  const toast = useToast();
  const navigation = useNavigation();

  const handleNavigateToProfile = () => {
    navigation.navigate('Profile' as never);
  };

  const handleNavigateToSettings = () => {
    navigation.navigate('ServerSettings' as never);
  };

  const handleNavigateToLogs = () => {
    toast.showInfo('Logs viewer coming soon!');
  };

  const handleNavigateToUsers = () => {
    toast.showInfo('User management coming soon!');
  };

  const menuItems: AdminMenuItem[] = [
    {
      id: 'profile',
      title: 'Profile',
      subtitle: 'View and edit your profile',
      icon: 'person',
      iconColor: Colors.primary.main,
      onPress: handleNavigateToProfile,
      isImplemented: true,
    },
    {
      id: 'settings',
      title: 'Server Settings',
      subtitle: 'Configure server options',
      icon: 'settings',
      iconColor: Colors.success.main,
      onPress: handleNavigateToSettings,
      isImplemented: true,
    },
    {
      id: 'logs',
      title: 'Logs',
      subtitle: 'View application logs',
      icon: 'document-text',
      iconColor: Colors.warning.main,
      onPress: handleNavigateToLogs,
      isImplemented: false,
    },
    {
      id: 'users',
      title: 'User Management',
      subtitle: 'Manage users and permissions',
      icon: 'people',
      iconColor: Colors.info.main,
      onPress: handleNavigateToUsers,
      isImplemented: false,
    },
  ];

  const serverDisplay = serverConfig?.serverUrl.replace(/^https?:\/\//, '') || 'Unknown';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="shield-checkmark" size={32} color={Colors.primary.main} />
          </View>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>
            Logged in as {serverConfig?.username || 'User'}
          </Text>
          <View style={styles.serverBadge}>
            <Ionicons name="server" size={14} color={Colors.text.tertiary} />
            <Text style={styles.serverText}>{serverDisplay}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <Card key={item.id} style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}20` }]}>
                    <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
                  </View>
                  <View style={styles.menuItemText}>
                    <View style={styles.titleRow}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      {!item.isImplemented && (
                        <View style={styles.comingSoonBadge}>
                          <Text style={styles.comingSoonText}>Soon</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Admin features for WOL Manager
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  // Scroll Content
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 100, // Space for bottom tab
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.primary.main}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.glass.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  serverText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginLeft: Spacing.xs,
    fontFamily: Typography.fontFamily.medium,
  },

  // Menu
  menuContainer: {
    gap: Spacing.md,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  menuItemTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  menuItemSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    fontFamily: Typography.fontFamily.regular,
  },
  comingSoonBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: Colors.warning.light + '30',
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.warning.main,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.medium,
  },

  // Footer
  footer: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontFamily: Typography.fontFamily.regular,
  },
});
