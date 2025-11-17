import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
} from '../constants/theme';

interface LoginScreenProps {
  serverUrl: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ serverUrl }) => {
  const { login, error: authError, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({ username: '', password: '' });

  const validateForm = () => {
    const errors = { username: '', password: '' };
    let isValid = true;

    if (!username.trim()) {
      errors.username = 'Username is required';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 3) {
      errors.password = 'Password must be at least 3 characters';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleLogin = async () => {
    clearError();
    setFormErrors({ username: '', password: '' });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await login(username, password, serverUrl);
      // Navigation is handled by AuthContext
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'Unable to login. Please check your credentials.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Extract server display name (without protocol)
  const serverDisplay = serverUrl.replace(/^https?:\/\//, '');

  return (
    <LinearGradient
      colors={Colors.primary.gradient}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Sign In</Text>
              <Text style={styles.subtitle}>to WOL Manager</Text>
              <View style={styles.serverBadge}>
                <Text style={styles.serverLabel}>Server:</Text>
                <Text style={styles.serverValue}>{serverDisplay}</Text>
              </View>
            </View>

            {/* Login Card */}
            <View style={styles.loginCard}>
              <View style={styles.form}>
                <Input
                  label="Username"
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setFormErrors({ ...formErrors, username: '' });
                  }}
                  error={formErrors.username}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />

                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setFormErrors({ ...formErrors, password: '' });
                  }}
                  error={formErrors.password}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.showPasswordText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  }
                />

                {authError && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{authError}</Text>
                  </View>
                )}

                <Button
                  title="Sign In"
                  onPress={handleLogin}
                  loading={isLoading}
                  fullWidth
                  size="large"
                  style={styles.submitButton}
                />
              </View>

              {/* Default Credentials Info */}
              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>Default Credentials:</Text>
                <Text style={styles.infoText}>Username: WOLadmin</Text>
                <Text style={styles.infoText}>Password: Manager</Text>
                <Text style={styles.infoNote}>
                  Please change these after first login
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.text.inverse,
    opacity: 0.9,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.md,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  serverLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.medium,
    marginRight: Spacing.xs,
    opacity: 0.8,
  },
  serverValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.inverse,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.medium,
  },

  // Login Card
  loginCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
  },

  // Form
  form: {
    marginBottom: Spacing.lg,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  showPasswordText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.medium,
  },

  // Error
  errorContainer: {
    backgroundColor: Colors.error.bg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error.dark,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },

  // Info Section
  infoSection: {
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  infoTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.xs,
  },
  infoNote: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
});
