import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Button, Input, Card } from '../components/UI';
import { apiClient, SessionExpiredError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';

interface AddHostScreenProps {
  navigation: any;
}

export const AddHostScreen: React.FC<AddHostScreenProps> = ({ navigation }) => {
  const { logout } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [publicAccess, setPublicAccess] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [errors, setErrors] = useState({
    name: '',
    macAddress: '',
    ipAddress: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load roles on mount
  React.useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setIsLoadingRoles(true);
      const roles = await apiClient.getRoles();
      setAvailableRoles(roles);
    } catch (error: any) {
      console.error('[AddHost] Failed to load roles:', error);
      // Use fallback roles
      setAvailableRoles([
        { id: 1, name: 'Admin' },
        { id: 2, name: 'User' },
        { id: 3, name: 'Guest' },
      ]);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const validateMacAddress = (mac: string): boolean => {
    const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macPattern.test(mac);
  };

  const validateIpAddress = (ip: string): boolean => {
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };

  const formatMacAddress = (text: string): string => {
    // Remove all non-hex characters
    const cleaned = text.replace(/[^0-9A-Fa-f]/g, '');
    
    // Add colons every 2 characters
    const formatted = cleaned.match(/.{1,2}/g)?.join(':') || cleaned;
    
    // Limit to 17 characters (12 hex + 5 colons)
    return formatted.substring(0, 17);
  };

  const validate = (): boolean => {
    const newErrors = {
      name: '',
      macAddress: '',
      ipAddress: '',
    };

    if (!name.trim()) {
      newErrors.name = 'Host name is required';
    }

    if (!macAddress.trim()) {
      newErrors.macAddress = 'MAC address is required';
    } else if (!validateMacAddress(macAddress)) {
      newErrors.macAddress = 'Invalid MAC address format (e.g., 01:23:45:67:89:AB)';
    }

    if (ipAddress.trim() && !validateIpAddress(ipAddress)) {
      newErrors.ipAddress = 'Invalid IP address format';
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.macAddress && !newErrors.ipAddress;
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.addHost({
        name,
        macAddress,
        ipAddress: ipAddress.trim() || undefined,
        description: description.trim() || undefined,
        visibleToRoles: selectedRoles.length > 0 ? selectedRoles : undefined,
        publicAccess,
      });
      
      // Show success message
      toast.showSuccess('Host added successfully!');
      
      // Navigate back to Main (closes modal) and trigger refresh on Hosts tab
      setTimeout(() => {
        navigation.navigate('Main', {
          screen: 'Hosts',
          params: { refresh: Date.now() },
        });
      }, 500);
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        toast.showError('Your session has expired. Please login again.');
        setTimeout(() => logout(), 1500);
        return;
      }
      toast.showError(error.message || 'Failed to add host');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Add New Host</Text>
            <Text style={styles.headerSubtitle}>Register a device for WOL</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>

            <Input
              label="Host Name *"
              placeholder="e.g., Office PC"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors({ ...errors, name: '' });
              }}
              error={errors.name}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Input
              label="Description"
              placeholder="Optional notes about this host"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
          </View>

          {/* Network Configuration */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="globe-outline" size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Network Configuration</Text>
            </View>

            <Input
              label="MAC Address *"
              placeholder="01:23:45:67:89:AB"
              value={macAddress}
              onChangeText={(text) => {
                const formatted = formatMacAddress(text);
                setMacAddress(formatted);
                setErrors({ ...errors, macAddress: '' });
              }}
              error={errors.macAddress}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={17}
              icon={<Ionicons name="cellular" size={20} color={Colors.text.tertiary} />}
            />

            <View style={styles.helpText}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.text.tertiary} />
              <Text style={styles.helpTextContent}>
                Format: XX:XX:XX:XX:XX:XX (hexadecimal)
              </Text>
            </View>

            <Input
              label="IP Address"
              placeholder="192.168.1.100"
              value={ipAddress}
              onChangeText={(text) => {
                setIpAddress(text);
                setErrors({ ...errors, ipAddress: '' });
              }}
              error={errors.ipAddress}
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Ionicons name="location" size={20} color={Colors.text.tertiary} />}
            />

            <View style={styles.helpText}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.text.tertiary} />
              <Text style={styles.helpTextContent}>
                IPv4 address for host identification (optional)
              </Text>
            </View>
          </View>

          {/* Access Control */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.primary.main} />
              <Text style={styles.sectionTitle}>Access Control</Text>
            </View>

            <Text style={styles.rolesSectionLabel}>Visible to Roles</Text>
            <Text style={styles.rolesSectionHelp}>
              Select which user roles can access this host. Leave empty for all users.
            </Text>

            {isLoadingRoles ? (
              <Text style={styles.loadingText}>Loading roles...</Text>
            ) : (
              availableRoles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleCard,
                  selectedRoles.includes(role.id) && styles.roleCardSelected,
                ]}
                onPress={() => toggleRole(role.id)}
                activeOpacity={0.7}
              >
                <View style={styles.roleCardContent}>
                  <View style={styles.roleIcon}>
                    <Ionicons name="people" size={20} color={Colors.primary.main} />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{role.name}</Text>
                    <Text style={styles.roleDescription}>Can view and wake this host</Text>
                  </View>
                  <View style={[
                    styles.roleCheckbox,
                    selectedRoles.includes(role.id) && styles.roleCheckboxSelected,
                  ]}>
                    {selectedRoles.includes(role.id) && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              ))
            )}

            <View style={styles.publicAccessContainer}>
              <View style={styles.publicAccessInfo}>
                <Text style={styles.publicAccessLabel}>Enable Public Access</Text>
                <Text style={styles.publicAccessWarning}>
                  <Ionicons name="warning" size={12} color={Colors.warning.main} />
                  {' '}Anyone with the link can wake this host
                </Text>
              </View>
              <Switch
                value={publicAccess}
                onValueChange={setPublicAccess}
                trackColor={{ false: Colors.border.main, true: Colors.primary.light }}
                thumbColor={publicAccess ? Colors.primary.main : Colors.background.secondary}
              />
            </View>
          </View>

          {/* Form Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Adding...' : 'Add Host'}
              </Text>
            </TouchableOpacity>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    padding: 0,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120, // Space for bottom nav
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    marginLeft: Spacing.sm,
  },

  // Text Area
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Help Text
  helpText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  helpTextContent: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginLeft: Spacing.xs,
    fontFamily: Typography.fontFamily.regular,
  },

  // Loading
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
    textAlign: 'center',
    padding: Spacing.lg,
    fontFamily: Typography.fontFamily.regular,
  },

  // Roles
  rolesSectionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.medium,
  },
  rolesSectionHelp: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
  },
  roleCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  roleCardSelected: {
    borderColor: Colors.primary.main,
    backgroundColor: Colors.primary.main + '10',
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.main + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  roleDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: 2,
    fontFamily: Typography.fontFamily.regular,
  },
  roleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleCheckboxSelected: {
    backgroundColor: Colors.primary.main,
    borderColor: Colors.primary.main,
  },

  // Public Access
  publicAccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.warning.bg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  publicAccessInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  publicAccessLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.xs,
  },
  publicAccessWarning: {
    fontSize: Typography.fontSize.xs,
    color: Colors.warning.dark,
    fontFamily: Typography.fontFamily.regular,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border.main,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.medium,
  },
  submitButton: {
    flex: 2,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  submitButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.bold,
  },
});
