import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../constants/theme';

// ===== GRADIENT BUTTON =====
interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'success' | 'danger';
  style?: ViewStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}) => {
  const gradientColors = {
    primary: [Colors.gradientStart.primaryButton, Colors.gradientEnd.primaryButton],
    success: [Colors.gradientStart.successButton, Colors.gradientEnd.successButton],
    danger: [Colors.gradientStart.dangerButton, Colors.gradientEnd.dangerButton],
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.buttonContainer, style]}
    >
      <LinearGradient
        colors={gradientColors[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradientButton,
          disabled && styles.buttonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.text.light} />
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ===== GLASS CARD =====
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style }) => {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
};

// ===== INPUT FIELD =====
interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  style?: ViewStyle;
}

export const InputField: React.FC<InputFieldProps> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  style,
}) => {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholder={placeholder}
      placeholderTextColor={Colors.text.secondary}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
    />
  );
};

// ===== STATUS BADGE =====
interface StatusBadgeProps {
  status: string;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const normalizedStatus = status.toLowerCase();
  
  const getStatusIcon = () => {
    switch (normalizedStatus) {
      case 'online':
        return '✓'; // Check icon
      case 'offline':
        return '✕'; // X icon
      default:
        return '?'; // Question icon
    }
  };

  const getStatusGradient = () => {
    switch (normalizedStatus) {
      case 'online':
        return [Colors.gradientStart.successButton, Colors.gradientEnd.successButton];
      case 'offline':
        return [Colors.gradientStart.dangerButton, Colors.gradientEnd.dangerButton];
      default:
        return ['#888', '#666'];
    }
  };

  return (
    <LinearGradient
      colors={getStatusGradient()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.statusBadge, style]}
    >
      <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
      <Text style={styles.statusText}>{normalizedStatus}</Text>
    </LinearGradient>
  );
};

// ===== HOST CARD =====
interface HostCardProps {
  host: {
    id: number;
    name: string;
    mac_address: string;
    ip: string | null;
    status?: string;
  };
  onWake: (hostId: number) => void;
  onView?: (hostId: number) => void;
  waking?: boolean;
}

export const HostCard: React.FC<HostCardProps> = ({
  host,
  onWake,
  onView,
  waking = false,
}) => {
  return (
    <GlassCard style={styles.hostCard}>
      <View style={styles.hostCardHeader}>
        <View style={styles.hostCardTitleRow}>
          <Text style={styles.hostCardTitle}>{host.name}</Text>
          {host.status && <StatusBadge status={host.status} />}
        </View>
      </View>

      <View style={styles.hostCardContent}>
        <View style={styles.hostInfoRow}>
          <Text style={styles.hostInfoLabel}>MAC Address:</Text>
          <View style={styles.macAddressBox}>
            <Text style={styles.hostInfoValue}>{host.mac_address}</Text>
          </View>
        </View>

        {host.ip && (
          <View style={styles.hostInfoRow}>
            <Text style={styles.hostInfoLabel}>IP Address:</Text>
            <Text style={styles.hostInfoValue}>{host.ip}</Text>
          </View>
        )}
      </View>

      <View style={styles.hostCardActions}>
        {onView && (
          <TouchableOpacity
            onPress={() => onView(host.id)}
            style={styles.outlineButton}
          >
            <Text style={styles.outlineButtonText}>View</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => onWake(host.id)}
          disabled={waking}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={[Colors.gradientStart.successButton, Colors.gradientEnd.successButton]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.wakeButton}
          >
            {waking ? (
              <ActivityIndicator color={Colors.text.light} size="small" />
            ) : (
              <View style={styles.wakeButtonContent}>
                <Text style={styles.wakeButtonIcon}>⚡</Text>
                <Text style={styles.wakeButtonText}>Wake</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

// ===== STATISTIC CARD =====
interface StatisticCardProps {
  title: string;
  value: string;
  iconGradient: string[];
  style?: ViewStyle;
}

export const StatisticCard: React.FC<StatisticCardProps> = ({
  title,
  value,
  iconGradient,
  style,
}) => {
  return (
    <GlassCard style={[styles.statisticCard, style]}>
      <LinearGradient
        colors={iconGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statisticIconContainer}
      >
        <Text style={styles.statisticValue}>{value}</Text>
      </LinearGradient>
      <Text style={styles.statisticTitle}>{title}</Text>
    </GlassCard>
  );
};

// ===== ERROR MESSAGE =====
interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss}>
          <Text style={styles.errorDismiss}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ===== LOADING SCREEN =====
export const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

// ===== STYLES =====
const styles = StyleSheet.create({
  // Button styles
  buttonContainer: {
    borderRadius: BorderRadius.md,
    ...Shadows.md,
  },
  gradientButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.text.light,
    ...Typography.bodyBold,
  },

  // Glass card styles
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Shadows.md,
  },

  // Input styles
  input: {
    backgroundColor: Colors.surface.light,
    borderWidth: 1,
    borderColor: Colors.text.secondary + '40',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
  },

  // Status badge styles
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    gap: Spacing.xs,
  },
  statusIcon: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: {
    color: Colors.text.light,
    ...Typography.small,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Host card styles
  hostCard: {
    marginBottom: Spacing.md,
  },
  hostCardHeader: {
    marginBottom: Spacing.md,
  },
  hostCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostCardTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  hostCardContent: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  hostInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hostInfoLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  hostInfoValue: {
    ...Typography.caption,
    color: Colors.text.primary,
  },
  macAddressBox: {
    backgroundColor: Colors.background.light,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    fontFamily: 'monospace',
  },
  hostCardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  outlineButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: Colors.primary,
    ...Typography.bodyBold,
  },
  wakeButton: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  wakeButtonIcon: {
    fontSize: 18,
    color: Colors.text.light,
  },
  wakeButtonText: {
    color: Colors.text.light,
    ...Typography.bodyBold,
  },

  // Statistic card styles
  statisticCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  statisticIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  statisticValue: {
    ...Typography.h2,
    color: Colors.text.light,
    fontWeight: '700',
  },
  statisticTitle: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },

  // Error message styles
  errorContainer: {
    backgroundColor: Colors.danger + '20',
    borderColor: Colors.danger,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.danger,
    flex: 1,
  },
  errorDismiss: {
    ...Typography.h3,
    color: Colors.danger,
    fontWeight: '700',
    paddingLeft: Spacing.sm,
  },

  // Loading screen styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.light,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.secondary,
  },
});
