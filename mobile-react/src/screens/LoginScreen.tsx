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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Button, Input, Card } from '../components/UI';
import PrismBackground from '../components/PrismBackground';
import { useAuth } from '../context/AuthContext';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
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
    <View style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <PrismBackground
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
        animationType="rotate"
        timeScale={0.5}
        height={2.5}
        baseWidth={4.0}
        scale={2.5}
        offset={{ x: 0, y: -180 }}
        hueShift={0}
        colorFrequency={1}
        noise={0.015}
        glow={0.6}
        bloom={0.6}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
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
            <Image
              source={require('../assets/images/logo-full.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

            {/* Login Card */}
            <Card style={styles.loginCard}>
              <View style={styles.form}>
                <Input
                  label="Username"
                  placeholder="Username"
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
                  placeholder="Password"
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

            </Card>

            {/* Server Info */}
            <View style={styles.serverInfo}>
              <Ionicons name="server-outline" size={16} color={Colors.text.tertiary} />
              <Text style={styles.serverText}>{serverDisplay}</Text>
            </View>

            {/* Default Credentials */}
            <View style={styles.credentialsHint}>
              <Text style={styles.hintText}>
                Default: <Text style={styles.hintBold}>WOLadmin</Text> / <Text style={styles.hintBold}>Manager</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
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
    marginBottom: Spacing['2xl'],
  },
  logo: {
    width: 280,
    height: 120,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
  },

  // Login Card
  loginCard: {
    marginBottom: Spacing.md,
    backgroundColor: '#1E1E23',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
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

  // Server Info
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  serverText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
    marginLeft: Spacing.xs,
  },

  // Credentials Hint
  credentialsHint: {
    alignItems: 'center',
  },
  hintText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
  },
  hintBold: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.medium,
  },
});
