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
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';
import { GlassCard, InputField, GradientButton, ErrorMessage } from '../components/UI';

interface SetupScreenProps {
  onComplete: (serverUrl: string) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    // Validate server URL
    if (!serverUrl.trim()) {
      setError('Please enter a server URL');
      return;
    }

    // Basic URL validation
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)(:\d{1,5})?(\/.*)?$/i;
    if (!urlPattern.test(serverUrl.trim())) {
      setError('Please enter a valid server URL (e.g., 192.168.1.100:8008 or wol.example.com)');
      return;
    }

    onComplete(serverUrl.trim());
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
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[Colors.gradientStart.primaryButton, Colors.gradientEnd.primaryButton]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logo}
              >
                <Text style={styles.logoText}>WOL</Text>
              </LinearGradient>
            </View>
            <Text style={styles.title}>WOL Manager</Text>
            <Text style={styles.subtitle}>Setup your server connection</Text>
          </View>

          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Server Configuration</Text>
            <Text style={styles.instructions}>
              Enter your WOL-Manager server URL below. You can use either HTTP or HTTPS.
            </Text>

            {error && (
              <ErrorMessage
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            <View style={styles.form}>
              <Text style={styles.label}>Server URL</Text>
              <InputField
                placeholder="192.168.1.100:8008 or wol.example.com"
                value={serverUrl}
                onChangeText={(text) => {
                  setServerUrl(text);
                  setError(null);
                }}
                autoCapitalize="none"
                keyboardType="url"
              />

              <View style={styles.examples}>
                <Text style={styles.examplesTitle}>Examples:</Text>
                <Text style={styles.exampleText}>• 192.168.1.100:8008</Text>
                <Text style={styles.exampleText}>• http://192.168.1.100:8008</Text>
                <Text style={styles.exampleText}>• https://wol.example.com</Text>
              </View>

              <GradientButton
                title="Continue"
                onPress={handleContinue}
                variant="primary"
                style={styles.button}
              />
            </View>
          </GlassCard>

          <Text style={styles.footer}>
            Make sure your WOL-Manager server is running and accessible from this device.
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
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...Typography.h1,
    color: Colors.text.light,
    fontWeight: '700',
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
    marginBottom: Spacing.sm,
  },
  instructions: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.md,
  },
  label: {
    ...Typography.bodyBold,
    color: Colors.text.primary,
    marginBottom: -Spacing.xs,
  },
  examples: {
    backgroundColor: Colors.background.light,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  examplesTitle: {
    ...Typography.caption,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  exampleText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
  button: {
    marginTop: Spacing.md,
  },
  footer: {
    ...Typography.caption,
    color: Colors.text.light,
    textAlign: 'center',
    opacity: 0.8,
  },
});
