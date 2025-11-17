import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = Colors.error.main,
  onConfirm,
  onCancel,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <Animated.View
          style={[
            styles.overlayBackground,
            {
              opacity: fadeAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dialogContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dialogWrapper}>
              {/* Blur background */}
              <View style={styles.dialogBlurContainer}>
                <BlurView
                  style={styles.dialogBlurLayer}
                  blurType="dark"
                  blurAmount={Platform.OS === 'ios' ? 10 : 5}
                  blurRadius={Platform.OS === 'android' ? 5 : undefined}
                  overlayColor={Platform.OS === 'android' ? 'rgba(45, 45, 48, 0.50)' : undefined}
                  reducedTransparencyFallbackColor={Colors.glass.background}
                />
              </View>
              
              {/* Content on top */}
              <View style={styles.dialogContent}>
                <Text style={styles.dialogTitle}>{title}</Text>
                <Text style={styles.dialogMessage}>{message}</Text>

                <View style={styles.dialogButtons}>
                  <TouchableOpacity
                    style={[styles.dialogButton, styles.cancelButton]}
                    onPress={onCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.dialogButton,
                      styles.confirmButton,
                      { backgroundColor: confirmColor },
                    ]}
                    onPress={onConfirm}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.confirmButtonText}>{confirmText}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const dialogWidth = Math.min(width - 48, 340);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dialogContainer: {
    width: dialogWidth,
  },
  dialogWrapper: {
    position: 'relative',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.xl,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  dialogBlurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    zIndex: -1,
  },
  dialogBlurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogContent: {
    padding: Spacing.lg,
    position: 'relative',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  dialogTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: Spacing.sm,
  },
  dialogMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: Typography.fontSize.base * 1.5,
    marginBottom: Spacing.lg,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dialogButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    fontFamily: Typography.fontFamily.medium,
  },
  confirmButton: {
    backgroundColor: Colors.error.main,
  },
  confirmButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.medium,
  },
});
