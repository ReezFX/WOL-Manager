import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Button, Input, Card } from '../components/UI';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { PublicHostConfig } from '../types';

interface SetupScreenProps {
  onComplete: (serverUrl: string) => void;
  onPublicHostComplete: (config: PublicHostConfig) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete, onPublicHostComplete }) => {
  const [setupType, setSetupType] = useState<'server' | 'publicHost'>('server');
  const [serverUrl, setServerUrl] = useState('');
  const [publicHostUrl, setPublicHostUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Animation refs and effects
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: setupType === 'server' ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [setupType, slideAnim]);

  const validateAndSubmit = async () => {
    setError('');

    if (setupType === 'publicHost') {
      return validatePublicHost();
    }

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

  const validatePublicHost = async () => {
    if (!publicHostUrl.trim()) {
      setError('Please enter a public host URL');
      return;
    }

    setIsLoading(true);

    try {
      // Extract token and base URL from the public host URL
      // Expected format: http://server:port/public/host/TOKEN
      const urlMatch = publicHostUrl.match(/^(https?:\/\/[^\/]+)\/public\/host\/([a-zA-Z0-9]+)$/);
      
      if (!urlMatch) {
        setError('Invalid public host URL format. Expected: http://server:port/public/host/TOKEN');
        setIsLoading(false);
        return;
      }

      const serverBaseUrl = urlMatch[1];
      const token = urlMatch[2];

      // Test connectivity by trying to fetch host status
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${serverBaseUrl}/public/host/${token}/status`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Successfully connected to public host
        const config: PublicHostConfig = {
          publicHostUrl: publicHostUrl.trim(),
          token,
          serverBaseUrl,
          lastAccessTimestamp: Date.now(),
        };
        onPublicHostComplete(config);
      } else {
        setError('Public host not accessible. Please check the URL.');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Connection timeout. Please check the URL and try again.');
      } else {
        setError('Cannot connect to public host. Please check the URL.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
            <Text style={styles.subtitle}>Setup your connection</Text>
          </View>

            {/* Setup Card */}
            <Card style={styles.setupCard}>
              {/* Setup Type Toggle */}
              <View 
                style={styles.toggleContainer}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
              >
                {/* Animated Slider Background */}
                <Animated.View
                  style={[
                    styles.toggleSlider,
                    {
                      width: containerWidth > 0 ? (containerWidth - 8) / 2 : '50%',
                      transform: [{
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (containerWidth - 8) / 2],
                        }),
                      }],
                    },
                  ]}
                />
                
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => {
                    setSetupType('server');
                    setError('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      setupType === 'server' && styles.toggleButtonTextActive,
                    ]}
                  >
                    Full Server
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => {
                    setSetupType('publicHost');
                    setError('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      setupType === 'publicHost' && styles.toggleButtonTextActive,
                    ]}
                  >
                    Public Host Link
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                {setupType === 'server' ? (
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
                ) : (
                  <Input
                    label="Public Host URL"
                    placeholder="e.g., http://192.168.1.100:8008/public/host/abc123"
                    value={publicHostUrl}
                    onChangeText={(text) => {
                      setPublicHostUrl(text);
                      setError('');
                    }}
                    error={error}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="go"
                    onSubmitEditing={validateAndSubmit}
                  />
                )}

                <Button
                  title="Continue"
                  onPress={validateAndSubmit}
                  loading={isLoading}
                  fullWidth
                  size="large"
                  style={styles.submitButton}
                />
              </View>
            </Card>

            {/* Helper Text */}
            <View style={styles.helpSection}>
              <Text style={styles.helpText}>
                {setupType === 'server'
                  ? 'Enter your server IP address and port (e.g., 192.168.1.100:8008)'
                  : 'Paste the complete public host URL including the token'}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    textAlign: 'center',
  },

  // Setup Card
  setupCard: {
    marginBottom: Spacing.md,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  toggleSlider: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    zIndex: 1,
  },
  toggleButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.medium,
  },
  toggleButtonTextActive: {
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.semibold,
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
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  helpText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    textAlign: 'center',
  },
});
