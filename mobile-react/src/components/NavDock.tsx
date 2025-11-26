import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {
  Colors,
  Spacing,
  Shadows,
} from '../constants/theme';

const { width } = Dimensions.get('window');
const DOCK_WIDTH = width - 48;
const TAB_HEIGHT = 64;

// Layout constants
const ADD_BUTTON_WIDTH = 60;
const PADDING_H = Spacing.xs;
const AVAILABLE_WIDTH = DOCK_WIDTH - (PADDING_H * 2);
const TAB_WIDTH = (AVAILABLE_WIDTH - ADD_BUTTON_WIDTH) / 2;

interface NavDockProps {
  scrollX: Animated.Value;
  activeIndex: number;
  onTabPress: (index: number, routeName: string) => void;
  screens: Array<{ key: string; routeName: string }>;
}

export const NavDock: React.FC<NavDockProps> = ({
  scrollX,
  onTabPress,
}) => {
  // Reusable hook/function for tab animations
  const getTabAnimations = (index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [1, 1.2, 1],
      extrapolate: 'clamp',
    });

    const activeOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const inactiveOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [1, 0, 1],
      extrapolate: 'clamp',
    });
    
    return { scale, activeOpacity, inactiveOpacity };
  };

  const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

  const renderTab = (index: number, routeName: string, iconName: string, activeIconName: string) => {
    const { scale, activeOpacity, inactiveOpacity } = getTabAnimations(index);

    return (
      <TouchableOpacity
        onPress={() => onTabPress(index, routeName)}
        style={styles.tabItem}
        activeOpacity={1} // Handle feedback manually via animation
      >
        <View style={styles.iconWrapper}>
          {/* Active State Background Glow */}
          <Animated.View style={[styles.activeGlow, { opacity: activeOpacity }]} />

          {/* Inactive Icon (Bottom Layer) - Fades Out */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: inactiveOpacity }]}>
            <View style={styles.centered}>
              <Ionicons
                name={iconName}
                size={24}
                color={Colors.text.tertiary}
              />
            </View>
          </Animated.View>

          {/* Active Icon (Top Layer) - Fades In */}
          <Animated.View style={[styles.centered, { opacity: activeOpacity, transform: [{ scale }] }]}>
            <Ionicons
              name={activeIconName}
              size={24}
              color={Colors.primary.main}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.dockOuterWrapper}>
        {/* Background */}
        <View style={styles.dockBackground}>
           <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={30}
            reducedTransparencyFallbackColor={Colors.glass.background}
            overlayColor={Platform.OS === 'android' ? 'rgba(20, 20, 23, 0.8)' : undefined}
          />
          <View style={styles.borderOverlay} />
        </View>

        {/* Content Container */}
        <View style={styles.tabContainer}>
          {/* Left Tab (Hosts) */}
          {renderTab(0, 'Hosts', 'grid-outline', 'grid')}

          {/* Center Add Button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onTabPress(-1, 'Add')}
              style={styles.addButtonWrapper}
            >
              <LinearGradient
                colors={Colors.primary.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addButtonGradient}
              >
                <Ionicons name="add" size={32} color={Colors.text.inverse} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Right Tab (Admin) */}
          {renderTab(1, 'Admin', 'settings-outline', 'settings')}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  dockOuterWrapper: {
    width: DOCK_WIDTH,
    height: TAB_HEIGHT,
    marginBottom: 24,
    borderRadius: 32,
    ...Shadows.glass,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dockBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 23, 0.6)',
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabContainer: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  tabItem: {
    width: TAB_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  activeGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(23, 162, 184, 0.15)', // Subtle primary glow
  },
  addButtonContainer: {
    width: ADD_BUTTON_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  addButtonWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    ...Shadows.lg,
    shadowColor: Colors.primary.main,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonGradient: {
    flex: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
