import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Spacing, Typography } from '../constants/theme';
import { GlassCard, InputField, GradientButton, ErrorMessage } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login, isLoading, error, clearError, serverConfig } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      return;
    }

    try {
      await login(username, password, serverConfig?.serverUrl || '');
    } catch (err) {
      // Error is handled by context
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[Colors.gradientStart.cardHeader, Colors.gradientEnd.cardHeader]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <LinearGradient
              colors={[Colors.gradientStart.primaryButton, Colors.gradientEnd.primaryButton]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Text style={styles.logoText}>🔐</Text>
            </LinearGradient>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Login</Text>

            {error && (
              <ErrorMessage
                message={error}
                onDismiss={clearError}
              />
            )}

            <View style={styles.form}>
              <View>
                <Text style={styles.label}>Username</Text>
                <InputField
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Text style={styles.label}>Password</Text>
                <InputField
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <GradientButton
                title="Login"
                onPress={handleLogin}
                loading={isLoading}
                disabled={!username.trim() || !password.trim()}
                variant="primary"
                style={styles.button}
              />
            </View>

            {serverConfig?.serverUrl && (
              <Text style={styles.serverInfo}>
                Server: {serverConfig.serverUrl}
              </Text>
            )}
          </GlassCard>

          <Text style={styles.footer}>
            Default credentials: WOLadmin / Manager
          </Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    ...Typography.h1,
    color: Colors.text.light,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.light,
    opacity: 0.9,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
  },
  label: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  button: {
    marginTop: Spacing.md,
  },
  serverInfo: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  footer: {
    ...Typography.caption,
    color: Colors.text.light,
    textAlign: 'center',
    opacity: 0.8,
  },
});
