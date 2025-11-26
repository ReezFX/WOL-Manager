import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacityProps,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  GlassEffect,
  Layout,
} from '../constants/theme';

// Loading Screen
export const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary.main} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

// Custom Button
interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.buttonFullWidth,
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyle = [
    styles.buttonText,
    styles[`buttonText_${variant}`],
    styles[`buttonText_${size}`],
  ];

  if (variant === 'primary') {
    return (
      <TouchableOpacity disabled={disabled || loading} {...props}>
        <LinearGradient
          colors={Colors.primary.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={buttonStyle}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              {icon && <View style={styles.buttonIcon}>{icon}</View>}
              <Text style={textStyle}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'secondary'
              ? Colors.text.inverse
              : Colors.primary.main
          }
        />
      ) : (
        <>
          {icon && <View style={styles.buttonIcon}>{icon}</View>}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// Custom Input
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  style,
  ...props
}) => {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            rightIcon && styles.inputWithRightIcon,
            style,
          ]}
          placeholderTextColor={Colors.text.tertiary}
          {...props}
        />
        {rightIcon && <View style={styles.inputRightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
};

// Card Component
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
};

// Glass Card (with blur effect simulation)
export const GlassCard: React.FC<CardProps> = ({
  children,
  style,
  onPress,
}) => {
  const content = (
    <View style={[styles.glassCard, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Status Badge
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'unknown';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const statusColor = Colors.status[status];
  const statusLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
      <View style={styles.statusDot} />
      <Text style={styles.statusText}>{statusLabel}</Text>
    </View>
  );
};

// Divider
interface DividerProps {
  style?: ViewStyle;
  color?: string;
}

export const Divider: React.FC<DividerProps> = ({ style, color }) => {
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: color || Colors.border.light },
        style,
      ]}
    />
  );
};

// Empty State
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <View style={styles.emptyState}>
      {icon && <View style={styles.emptyStateIcon}>{icon}</View>}
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {description && (
        <Text style={styles.emptyStateDescription}>{description}</Text>
      )}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant="primary"
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
  },

  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    ...Shadows.md,
  },
  button_primary: {
    // Gradient background applied via LinearGradient
  },
  button_secondary: {
    backgroundColor: Colors.text.secondary,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary.main,
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  button_small: {
    height: 36,
    paddingHorizontal: Spacing.md,
  },
  button_medium: {
    height: Layout.buttonHeight,
  },
  button_large: {
    height: 56,
    paddingHorizontal: Spacing.xl,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: Typography.fontFamily.medium,
    textAlign: 'center',
  },
  buttonText_primary: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  buttonText_secondary: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  buttonText_outline: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  buttonText_ghost: {
    color: Colors.primary.main,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  buttonText_small: {
    fontSize: Typography.fontSize.sm,
  },
  buttonText_medium: {
    fontSize: Typography.fontSize.base,
  },
  buttonText_large: {
    fontSize: Typography.fontSize.lg,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },

  // Input
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border.light,
    height: Layout.inputHeight,
    ...Shadows.sm,
  },
  inputWrapperError: {
    borderColor: Colors.error.main,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.regular,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  inputIcon: {
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
  },
  inputRightIcon: {
    paddingRight: Spacing.md,
    paddingLeft: Spacing.xs,
  },
  inputError: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error.main,
    marginTop: Spacing.xs,
    fontFamily: Typography.fontFamily.regular,
  },

  // Card
  card: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.md,
  },

  // Glass Card
  glassCard: {
    ...GlassEffect,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.text.inverse,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
  },

  // Divider
  divider: {
    height: 1,
    width: '100%',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyStateIcon: {
    marginBottom: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.bold,
  },
  emptyStateDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
  },
  emptyStateButton: {
    marginTop: Spacing.md,
  },
});
