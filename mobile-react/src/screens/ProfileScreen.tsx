import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Card, Divider, Button } from '../components/UI';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';

export const ProfileScreen: React.FC = () => {
  const { serverConfig, logout } = useAuth();
  const toast = useToast();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const serverDisplay = serverConfig?.serverUrl.replace(/^https?:\/\//, '') || 'Unknown';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        confirmColor={Colors.error.main}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <Card style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {serverConfig?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </View>

          <Text style={styles.username}>{serverConfig?.username || 'User'}</Text>
          
          <View style={styles.serverBadge}>
            <Text style={styles.serverLabel}>Connected to</Text>
            <Text style={styles.serverValue}>{serverDisplay}</Text>
          </View>
        </Card>

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => toast.showInfo('Change password coming soon!')}
          >
            <Text style={styles.menuItemText}>Change Password</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => toast.showInfo('Edit profile coming soon!')}
          >
            <Text style={styles.menuItemText}>Edit Profile</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* App Settings */}
        <Text style={styles.sectionTitle}>App</Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => toast.showInfo('Settings coming soon!')}
          >
            <Text style={styles.menuItemText}>Notifications</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => toast.showInfo('Theme settings coming soon!')}
          >
            <Text style={styles.menuItemText}>Appearance</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <Divider />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => toast.showInfo('For help, please contact your system administrator.', 'Help')}
          >
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
        />

        {/* Footer */}
        <Text style={styles.footer}>
          WOL Manager Mobile © 2024
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

  // Card
  card: {
    marginBottom: Spacing.md,
  },

  // Avatar
  avatarContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  avatarText: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.bold,
  },

  // Username
  username: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.bold,
  },

  // Server Badge
  serverBadge: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  serverLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.regular,
  },
  serverValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
  },

  // Section Title
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
    fontFamily: Typography.fontFamily.medium,
  },

  // Menu Item
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  menuItemText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.regular,
  },
  menuItemChevron: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text.tertiary,
    fontWeight: Typography.fontWeight.bold,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  infoLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.regular,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.medium,
  },

  // Logout Button
  logoutButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // Footer
  footer: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    fontFamily: Typography.fontFamily.regular,
  },
});
