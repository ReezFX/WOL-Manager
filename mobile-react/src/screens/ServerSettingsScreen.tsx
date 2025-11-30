import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/UI';
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

export const ServerSettingsScreen: React.FC<ServerSettingsScreenProps> = ({ navigation }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentLogProfile, setCurrentLogProfile] = useState('MEDIUM');
  
  const [settings, setSettings] = useState<AppSettings>({
    min_password_length: 8,
    require_special_characters: false,
    require_numbers: false,
    password_expiration_days: 0,
    session_timeout_minutes: 30,
    max_concurrent_sessions: 0,
    log_profile: 'MEDIUM',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSettings();
      
      if (response.success && response.settings) {
        console.log('[ServerSettings] Loaded settings:', response.settings);
        console.log('[ServerSettings] Current log profile from server:', response.current_log_profile);
        
        // Use the current_log_profile (what's active) if available,
        // otherwise fall back to the form value
        const activeLogProfile = response.current_log_profile || response.settings.log_profile || 'MEDIUM';
        
        // Update settings state - use active profile for the button highlight
        setSettings({
          ...response.settings,
          log_profile: activeLogProfile,
        });
        
        // Update current log profile indicator (what's active in the environment)
        setCurrentLogProfile(activeLogProfile);
        
        console.log('[ServerSettings] UI updated with:', {
          settings: { ...response.settings, log_profile: activeLogProfile },
          currentLogProfile: activeLogProfile,
        });
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
        toast.showSuccess('Settings saved successfully');
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Server Settings</Text>
        </View>

        {/* Password Policy Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>🔒</Text>
            </View>
            <Text style={styles.sectionTitle}>Password Policy</Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Minimum Password Length</Text>
                <Text style={styles.settingHelp}>
                  Minimum number of characters required (6-16)
                </Text>
              </View>
              <TextInput
                style={styles.numberInput}
                keyboardType="numeric"
                value={String(settings.min_password_length)}
                onChangeText={(text) => {
                  const value = parseInt(text) || 6;
                  updateSetting('min_password_length', Math.max(6, Math.min(16, value)));
                }}
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Password Expiration (Days)</Text>
                <Text style={styles.settingHelp}>
                  Use 0 for no expiration (0-365)
                </Text>
              </View>
              <TextInput
                style={styles.numberInput}
                keyboardType="numeric"
                value={String(settings.password_expiration_days)}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  updateSetting('password_expiration_days', Math.max(0, Math.min(365, value)));
                }}
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Require Special Characters</Text>
                <Text style={styles.settingHelp}>
                  At least one special character (e.g., @, #, $)
                </Text>
              </View>
              <Switch
                value={settings.require_special_characters}
                onValueChange={(value) =>
                  updateSetting('require_special_characters', value)
                }
                trackColor={{ false: Colors.border.light, true: Colors.primary.main }}
                thumbColor={Colors.text.primary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Require Numbers</Text>
                <Text style={styles.settingHelp}>
                  At least one number in passwords
                </Text>
              </View>
              <Switch
                value={settings.require_numbers}
                onValueChange={(value) =>
                  updateSetting('require_numbers', value)
                }
                trackColor={{ false: Colors.border.light, true: Colors.primary.main }}
                thumbColor={Colors.text.primary}
              />
            </View>
          </Card>
        </View>

        {/* Session Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>⏱️</Text>
            </View>
            <Text style={styles.sectionTitle}>Session Management</Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Session Timeout (Minutes)</Text>
                <Text style={styles.settingHelp}>
                  Minutes until session expires (5-10080)
                </Text>
              </View>
              <TextInput
                style={styles.numberInput}
                keyboardType="numeric"
                value={String(settings.session_timeout_minutes)}
                onChangeText={(text) => {
                  const value = parseInt(text) || 5;
                  updateSetting('session_timeout_minutes', Math.max(5, Math.min(10080, value)));
                }}
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Max Concurrent Sessions</Text>
                <Text style={styles.settingHelp}>
                  Use 0 for unlimited (0-10)
                </Text>
              </View>
              <TextInput
                style={styles.numberInput}
                keyboardType="numeric"
                value={String(settings.max_concurrent_sessions)}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  updateSetting('max_concurrent_sessions', Math.max(0, Math.min(10, value)));
                }}
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>
          </Card>
        </View>

        {/* Logging Configuration Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>📊</Text>
            </View>
            <Text style={styles.sectionTitle}>Logging Configuration</Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.settingColumn}>
              <Text style={styles.settingLabel}>Log Profile</Text>
              <Text style={styles.settingHelp}>
                Sets the verbosity level of application logs
              </Text>
              
              <View style={styles.logProfileSelector}>
                {['LOW', 'MEDIUM', 'HIGH', 'DEBUG'].map((profile) => (
                  <TouchableOpacity
                    key={profile}
                    style={[
                      styles.logProfileOption,
                      settings.log_profile === profile && styles.logProfileOptionActive,
                    ]}
                    onPress={() => updateSetting('log_profile', profile)}
                  >
                    <Text
                      style={[
                        styles.logProfileText,
                        settings.log_profile === profile && styles.logProfileTextActive,
                      ]}
                    >
                      {profile}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.currentProfileIndicator}>
                <Text style={styles.currentProfileLabel}>
                  Current active profile from environment
                </Text>
                <Text style={styles.currentProfileValue}>{currentLogProfile}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              <Text style={styles.saveButtonIcon}>💾</Text>
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>

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
    marginBottom: Spacing.lg,
  },
  backButton: {
    marginBottom: Spacing.sm,
  },
  backButtonText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.primary.main,
    fontFamily: Typography.fontFamily.medium,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
  },

  // Section
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary.main + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.medium,
  },

  // Card
  card: {
    marginBottom: 0,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
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
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  settingHelp: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: Typography.fontFamily.regular,
  },

  numberInput: {
    width: 80,
    height: 40,
    textAlign: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.medium,
    paddingHorizontal: Spacing.sm,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.sm,
  },

  // Log Profile Selector
  logProfileSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  logProfileOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    borderWidth: 2,
    borderColor: Colors.border.light,
    alignItems: 'center',
  },
  logProfileOptionActive: {
    backgroundColor: Colors.primary.main + '20',
    borderColor: Colors.primary.main,
  },
  logProfileText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.medium,
  },
  logProfileTextActive: {
    color: Colors.primary.main,
  },

  currentProfileIndicator: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.info.main,
  },
  currentProfileLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.regular,
  },
  currentProfileValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.info.main,
    fontFamily: Typography.fontFamily.bold,
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    ...Shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  saveButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.medium,
  },

  footer: {
    height: Spacing['2xl'],
  },
});
