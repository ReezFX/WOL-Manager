import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  TextInput,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { GlassCard, Button } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../api/client';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';

interface ServerSettingsScreenProps {
  navigation?: any;
}

interface AppSettings {
  min_password_length: number;
  require_special_characters: boolean;
  require_numbers: boolean;
  password_expiration_days: number;
  session_timeout_minutes: number;
  max_concurrent_sessions: number;
  log_profile: string;
}

// Animation wrapper for sections
const FadeInView = ({ index, children }: { index: number; children: React.ReactNode }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, {
        toValue: 1,
        duration: 1200,
        delay: index * 180,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Ease-out cubic bezier
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1400,
        delay: index * 180,
        easing: Easing.bezier(0.16, 1, 0.3, 1), // Ease-out expo bezier (smoother)
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY }],
      }}
      renderToHardwareTextureAndroid={true}
      shouldRasterizeIOS={true}
    >
      {children}
    </Animated.View>
  );
};

// Reusable Scale Animation Component
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const ScalePressable = ({ 
  onPress, 
  children, 
  style, 
  activeScale = 0.95,
  disabled = false 
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
  activeScale?: number;
  disabled?: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 50,
      bounciness: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 10,
    }).start();
  };

  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[style, { transform: [{ scale }] }]}
      disabled={disabled}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
};

// Animated Save Button Component
const AnimatedSaveButton = ({ 
  onPress, 
  loading, 
  success 
}: { 
  onPress: () => void; 
  loading: boolean; 
  success: boolean;
}) => {
  const successAnim = useRef(new Animated.Value(0)).current; // 0 -> 1
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (success) {
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.sequence([
             Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
             Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ])
      ]).start();
    } else {
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [success]);

  const handlePressIn = () => {
    if (!loading && !success) {
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 10 }).start();
    }
  };

  const handlePressOut = () => {
    if (!success) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 10 }).start();
    }
  };

  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      disabled={loading || success}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[styles.saveButton, { transform: [{ scale: scaleAnim }] }]}
    >
      {/* Default Gradient (Primary) */}
      <LinearGradient
        colors={Colors.primary.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Success Gradient (Overlay - Green) */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: successAnim }]}>
         <LinearGradient
            colors={[Colors.success.main, '#2ecc71']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
      </Animated.View>

      {/* Content */}
      <View style={styles.saveButtonContent}>
        {loading ? (
           <ActivityIndicator color={Colors.text.inverse} />
        ) : (
           <>
             {/* Normal Content */}
             <Animated.View style={[
               styles.buttonContentRow, 
               { 
                 opacity: successAnim.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0] }),
                 transform: [{ translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }]
               }
             ]}> 
                <Ionicons name="save-outline" size={20} color={Colors.text.inverse} style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Save Settings</Text>
             </Animated.View>
             
             {/* Success Content */}
              <Animated.View style={[
                styles.buttonContentRow, 
                StyleSheet.absoluteFill, 
                { 
                  opacity: successAnim.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1] }),
                  transform: [
                    { scale: successAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.5, 1.2, 1] }) },
                    { translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }
                  ]
                }
              ]}> 
                <Ionicons name="checkmark-circle" size={24} color={Colors.text.inverse} style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Saved!</Text>
             </Animated.View>
           </>
        )}
      </View>
    </AnimatedTouchableOpacity>
  );
};

export const ServerSettingsScreen: React.FC<ServerSettingsScreenProps> = ({ navigation }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentLogProfile, setCurrentLogProfile] = useState('MEDIUM');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>({
    min_password_length: 8,
    require_special_characters: false,
    require_numbers: false,
    password_expiration_days: 0,
    session_timeout_minutes: 30,
    max_concurrent_sessions: 0,
    log_profile: 'MEDIUM',
  });

  // Local state for input fields to allow smooth typing
  const [inputValues, setInputValues] = useState<{
    min_password_length: string;
    password_expiration_days: string;
    session_timeout_minutes: string;
    max_concurrent_sessions: string;
  }>({
    min_password_length: '8',
    password_expiration_days: '0',
    session_timeout_minutes: '30',
    max_concurrent_sessions: '0',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSettings();
      
      if (response.success && response.settings) {
        console.log('[ServerSettings] Loaded settings:', response.settings);
        
        // Use the current_log_profile (what's active) if available,
        // otherwise fall back to the form value
        const activeLogProfile = response.current_log_profile || response.settings.log_profile || 'MEDIUM';
        
        // Update settings state - use active profile for the button highlight
        setSettings({
          ...response.settings,
          log_profile: activeLogProfile,
        });
        
        // Sync input values with loaded settings
        setInputValues({
          min_password_length: String(response.settings.min_password_length),
          password_expiration_days: String(response.settings.password_expiration_days),
          session_timeout_minutes: String(response.settings.session_timeout_minutes),
          max_concurrent_sessions: String(response.settings.max_concurrent_sessions),
        });
        
        // Update current log profile indicator (what's active in the environment)
        setCurrentLogProfile(activeLogProfile);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('[ServerSettings] Load error:', error);
      toast.showError(error.message || 'Failed to load settings');
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await apiClient.updateSettings(settings);
      
      if (response.success) {
        setCurrentLogProfile(response.current_log_profile || settings.log_profile);
        
        // Trigger success animation
        setSaveSuccess(true);
        toast.showSuccess('Settings saved successfully');
        
        // Reset after delay
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      } else {
        throw new Error(response.message || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('[ServerSettings] Save error:', error);
      toast.showError(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.main} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          {/* Header */}
          <View style={styles.header}>
            <ScalePressable
              style={styles.backButton}
              onPress={() => navigation?.goBack()}
            >
              <View style={styles.backButtonIcon}>
                <Ionicons name="chevron-back" size={24} color={Colors.primary.main} />
              </View>
            </ScalePressable>
            <Text style={styles.headerTitle}>Server Settings</Text>
          </View>

          {/* Password Policy Section */}
          <FadeInView index={0}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['rgba(23, 162, 184, 0.2)', 'rgba(23, 162, 184, 0.05)']}
                  style={styles.sectionIconContainer}
                >
                  <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary.main} />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Password Policy</Text>
              </View>

              <GlassCard style={styles.card}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Minimum Password Length</Text>
                    <Text style={styles.settingHelp}>
                      Required characters (6-16)
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.numberInput,
                      focusedInput === 'min_password_length' && styles.numberInputFocused
                    ]}
                    keyboardType="numeric"
                    value={inputValues.min_password_length}
                    onFocus={() => setFocusedInput('min_password_length')}
                    onBlur={() => {
                      setFocusedInput(null);
                      const value = parseInt(inputValues.min_password_length) || 6;
                      const clamped = Math.max(6, Math.min(16, value));
                      updateSetting('min_password_length', clamped);
                      setInputValues(prev => ({ ...prev, min_password_length: String(clamped) }));
                    }}
                    onChangeText={(text) => {
                      // Allow empty or numeric input only
                      if (text === '' || /^\d+$/.test(text)) {
                        setInputValues(prev => ({ ...prev, min_password_length: text }));
                      }
                    }}
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Password Expiration</Text>
                    <Text style={styles.settingHelp}>
                      Days until expiry (0 for none)
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.numberInput,
                      focusedInput === 'password_expiration_days' && styles.numberInputFocused
                    ]}
                    keyboardType="numeric"
                    value={inputValues.password_expiration_days}
                    onFocus={() => setFocusedInput('password_expiration_days')}
                    onBlur={() => {
                      setFocusedInput(null);
                      const value = parseInt(inputValues.password_expiration_days) || 0;
                      const clamped = Math.max(0, Math.min(365, value));
                      updateSetting('password_expiration_days', clamped);
                      setInputValues(prev => ({ ...prev, password_expiration_days: String(clamped) }));
                    }}
                    onChangeText={(text) => {
                      if (text === '' || /^\d+$/.test(text)) {
                        setInputValues(prev => ({ ...prev, password_expiration_days: text }));
                      }
                    }}
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Special Characters</Text>
                    <Text style={styles.settingHelp}>
                      Require at least one symbol
                    </Text>
                  </View>
                  <Switch
                    value={settings.require_special_characters}
                    onValueChange={(value) =>
                      updateSetting('require_special_characters', value)
                    }
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primary.main + '80' }}
                    thumbColor={settings.require_special_characters ? Colors.primary.main : Colors.text.tertiary}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Require Numbers</Text>
                    <Text style={styles.settingHelp}>
                      Require at least one digit
                    </Text>
                  </View>
                  <Switch
                    value={settings.require_numbers}
                    onValueChange={(value) =>
                      updateSetting('require_numbers', value)
                    }
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primary.main + '80' }}
                    thumbColor={settings.require_numbers ? Colors.primary.main : Colors.text.tertiary}
                  />
                </View>
              </GlassCard>
            </View>
          </FadeInView>

          {/* Session Management Section */}
          <FadeInView index={1}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['rgba(255, 193, 7, 0.2)', 'rgba(255, 193, 7, 0.05)']}
                  style={styles.sectionIconContainer}
                >
                  <Ionicons name="time-outline" size={20} color={Colors.warning.main} />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Session Management</Text>
              </View>

              <GlassCard style={styles.card}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Session Timeout</Text>
                    <Text style={styles.settingHelp}>
                      Minutes until inactive logout
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.numberInput,
                      focusedInput === 'session_timeout_minutes' && styles.numberInputFocused
                    ]}
                    keyboardType="numeric"
                    value={inputValues.session_timeout_minutes}
                    onFocus={() => setFocusedInput('session_timeout_minutes')}
                    onBlur={() => {
                      setFocusedInput(null);
                      const value = parseInt(inputValues.session_timeout_minutes) || 5;
                      const clamped = Math.max(5, Math.min(10080, value));
                      updateSetting('session_timeout_minutes', clamped);
                      setInputValues(prev => ({ ...prev, session_timeout_minutes: String(clamped) }));
                    }}
                    onChangeText={(text) => {
                      if (text === '' || /^\d+$/.test(text)) {
                        setInputValues(prev => ({ ...prev, session_timeout_minutes: text }));
                      }
                    }}
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Max Concurrent Sessions</Text>
                    <Text style={styles.settingHelp}>
                      Limit user sessions (0 for unlimited)
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.numberInput,
                      focusedInput === 'max_concurrent_sessions' && styles.numberInputFocused
                    ]}
                    keyboardType="numeric"
                    value={inputValues.max_concurrent_sessions}
                    onFocus={() => setFocusedInput('max_concurrent_sessions')}
                    onBlur={() => {
                      setFocusedInput(null);
                      const value = parseInt(inputValues.max_concurrent_sessions) || 0;
                      const clamped = Math.max(0, Math.min(10, value));
                      updateSetting('max_concurrent_sessions', clamped);
                      setInputValues(prev => ({ ...prev, max_concurrent_sessions: String(clamped) }));
                    }}
                    onChangeText={(text) => {
                      if (text === '' || /^\d+$/.test(text)) {
                        setInputValues(prev => ({ ...prev, max_concurrent_sessions: text }));
                      }
                    }}
                    placeholderTextColor={Colors.text.tertiary}
                  />
                </View>
              </GlassCard>
            </View>
          </FadeInView>

          {/* Logging Configuration Section */}
          <FadeInView index={2}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={['rgba(40, 167, 69, 0.2)', 'rgba(40, 167, 69, 0.05)']}
                  style={styles.sectionIconContainer}
                >
                  <Ionicons name="stats-chart-outline" size={20} color={Colors.success.main} />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Logging Configuration</Text>
              </View>

              <GlassCard style={styles.card}>
                <View style={styles.settingColumn}>
                  <Text style={styles.settingLabel}>Log Profile</Text>
                  <Text style={styles.settingHelp}>
                    Sets the verbosity level of application logs
                  </Text>
                  
                  <View style={styles.logProfileGrid}>
                    {['LOW', 'MEDIUM', 'HIGH', 'DEBUG'].map((profile) => (
                      <ScalePressable
                        key={profile}
                        style={[
                          styles.logProfileOption,
                          settings.log_profile === profile && styles.logProfileOptionActive,
                        ]}
                        onPress={() => updateSetting('log_profile', profile)}
                      >
                         {settings.log_profile === profile && (
                          <LinearGradient
                            colors={Colors.primary.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                        <Text
                          style={[
                            styles.logProfileText,
                            settings.log_profile === profile && styles.logProfileTextActive,
                          ]}
                        >
                          {profile}
                        </Text>
                      </ScalePressable>
                    ))}
                  </View>

                  <View style={styles.currentProfileIndicator}>
                    <Ionicons name="information-circle-outline" size={18} color={Colors.info.main} style={{ marginRight: 8 }} />
                    <View>
                      <Text style={styles.currentProfileLabel}>
                        Current Active Profile
                      </Text>
                      <Text style={styles.currentProfileValue}>{currentLogProfile}</Text>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </View>
          </FadeInView>

          {/* Save Button */}
          <FadeInView index={3}>
            <View style={styles.actionContainer}>
              <AnimatedSaveButton
                onPress={saveSettings}
                loading={saving}
                success={saveSuccess}
              />
            </View>
          </FadeInView>

          {/* Footer Spacing */}
          <View style={styles.footer} />
        </ScrollView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

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

  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  backButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
  },

  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.medium,
  },

  // Card
  card: {
    padding: Spacing.md,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 60,
  },
  settingColumn: {
    paddingVertical: Spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: 4,
    fontFamily: Typography.fontFamily.medium,
  },
  settingHelp: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
  },

  numberInput: {
    width: 80,
    height: 44,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
    paddingHorizontal: Spacing.sm,
  },
  numberInputFocused: {
    borderColor: Colors.primary.main,
    backgroundColor: 'rgba(23, 162, 184, 0.1)',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: Spacing.sm,
  },

  // Log Profile Grid
  logProfileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  logProfileOption: {
    width: '48%', // Ensures 2 items per row with a small gap
    height: 48,   // Fixed height for consistency
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.xs, // Extra safety if gap isn't fully supported
  },
  logProfileOptionActive: {
    borderColor: 'transparent',
    // Background handled by LinearGradient
  },
  logProfileText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.medium,
    zIndex: 1,
  },
  logProfileTextActive: {
    color: Colors.text.inverse,
  },

  currentProfileIndicator: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: 'rgba(23, 162, 184, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(23, 162, 184, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentProfileLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: 2,
    fontFamily: Typography.fontFamily.regular,
  },
  currentProfileValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.info.main,
    fontFamily: Typography.fontFamily.bold,
  },

  // Save Button
  saveButton: {
    borderRadius: BorderRadius.lg,
    height: 56, // Fixed height for consistent animation
    width: '100%',
    overflow: 'hidden',
    ...Shadows.md,
  },
  saveButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.medium,
  },

  actionContainer: {
    marginTop: Spacing.lg,
  },

  footer: {
    height: Spacing['2xl'],
  },
});
