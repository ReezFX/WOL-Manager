import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItemData {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastItemData[];
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<{
  toast: ToastItemData;
  onRemove: (id: string) => void;
  index: number;
}> = ({ toast, onRemove, index }) => {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Shake animation for errors
    if (toast.type === 'error') {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 8,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -8,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Auto dismiss
    const duration = toast.duration ?? 3000;
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove(toast.id);
    });
  };

  const getToastStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          backgroundColor: Colors.success.main,
          icon: '✓',
        };
      case 'error':
        return {
          backgroundColor: Colors.error.main,
          icon: '⚠',
        };
      case 'warning':
        return {
          backgroundColor: Colors.warning.main,
          icon: '!',
        };
      case 'info':
        return {
          backgroundColor: Colors.info.main,
          icon: 'i',
        };
    }
  };

  const toastStyle = getToastStyle();

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: toastStyle.backgroundColor,
          transform: [
            { translateX: Animated.add(slideAnim, shakeAnim) },
          ],
          opacity: opacityAnim,
          top: index * 80,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        <View style={styles.toastIcon}>
          <Text style={styles.toastIconText}>{toastStyle.icon}</Text>
        </View>
        <View style={styles.toastText}>
          <Text style={styles.toastTitle}>{toast.title}</Text>
          <Text style={styles.toastMessage}>{toast.message}</Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          index={index}
        />
      ))}
    </View>
  );
};

const { width } = Dimensions.get('window');
const toastWidth = Math.min(width - 32, 400);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 16,
    left: 16,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  toast: {
    position: 'absolute',
    right: 0,
    minWidth: 280,
    maxWidth: toastWidth,
    borderRadius: BorderRadius.lg,
    ...Shadows.lg,
    overflow: 'hidden',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingRight: Spacing.sm,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  toastIconText: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  toastText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  toastTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.bold,
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.inverse,
    fontFamily: Typography.fontFamily.regular,
    lineHeight: Typography.fontSize.sm * 1.4,
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
    lineHeight: 24,
  },
});
