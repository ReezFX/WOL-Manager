import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../components/UI';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
} from '../constants/theme';

interface SetupScreenProps {
  onComplete: (serverUrl: string) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateAndSubmit = async () => {
    setError('');

    if (!serverUrl.trim()) {
      setError('Please enter a server URL');
      return;
    }

    // Basic URL validation
    let url = serverUrl.trim();
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      setError('Please enter a valid URL (e.g., 192.168.1.100:8008)');
      return;
    }

    setIsLoading(true);

    // Simple connectivity check
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 404 || response.status === 302) {
        // Server is reachable
        onComplete(url);
      } else {
        setError('Server not reachable. Please check the URL.');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Connection timeout. Please check the URL and try again.');
      } else {
        setError('Cannot connect to server. Please check the URL.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
              <Text style={styles.title}>Welcome to</Text>
              <Text style={styles.titleBold}>WOL Manager</Text>
              <Text style={styles.subtitle}>
                Wake-on-LAN management made simple
              </Text>
            </View>

            {/* Setup Card */}
            <View style={styles.setupCard}>
              <Text style={styles.cardTitle}>Setup Connection</Text>
              <Text style={styles.cardDescription}>
                Enter your WOL Manager server URL to get started
              </Text>

              <View style={styles.form}>
                <Input
                  label="Server URL"
                  placeholder="e.g., 192.168.1.100:8008"
                  value={serverUrl}
                  onChangeText={(text) => {
                    setServerUrl(text);
                    setError('');
                  }}
                  error={error}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={validateAndSubmit}
                />

                <Button
                  title="Continue"
                  onPress={validateAndSubmit}
                  loading={isLoading}
                  fullWidth
                  size="large"
                  style={styles.submitButton}
                />
              </View>

              {/* Helper Text */}
              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>Quick Setup Tips:</Text>
                <Text style={styles.helpText}>
                  • Make sure your device is on the same network
                </Text>
                <Text style={styles.helpText}>
                  • Use IP address and port (e.g., 192.168.1.100:8008)
                </Text>
                <Text style={styles.helpText}>
                  • The server must be running and accessible
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
    fontSize: Typography.fontSize['3xl'],
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.xs,
  },
  titleBold: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    opacity: 0.9,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
  },

  // Setup Card
  setupCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
  },
  cardTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.lg,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },

  // Form
  form: {
    marginBottom: Spacing.lg,
  },
  submitButton: {
    marginTop: Spacing.md,
  },

  // Help Section
  helpSection: {
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  helpTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.medium,
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
    marginBottom: Spacing.xs,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
});
