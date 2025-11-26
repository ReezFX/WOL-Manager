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

// Calculate the width of each tab section for the sliding indicator
// Structure: [Tab1] [AddButton] [Tab2]
// AddButton is fixed width (~60), remaining space divided by 2
const ADD_BUTTON_WIDTH = 60;
// Account for paddingHorizontal in tabContainer (Spacing.xs = 4)
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
  activeIndex,
  onTabPress,
  screens,
}) => {
  // Interpolate position of the sliding pill
  // Input Range: [0, width * (screens.length - 1)] (Scroll position)
  // Output Range: [OffsetLeft, OffsetRight] (X Position in Dock)
  
  // 0 (Hosts) -> Center of Left Tab
  // width (Admin) -> Center of Right Tab
  
  // We want the pill to be centered in the TAB_WIDTH area.
  // Left Tab Center: TAB_WIDTH / 2
  // Right Tab Center: TAB_WIDTH + ADD_BUTTON_WIDTH + (TAB_WIDTH / 2)
  
  // Adjust for pill width (e.g. 48px)
  const PILL_WIDTH = 48;
  const startX = PADDING_H + (TAB_WIDTH - PILL_WIDTH) / 2;
  const endX = PADDING_H + TAB_WIDTH + ADD_BUTTON_WIDTH + (TAB_WIDTH - PILL_WIDTH) / 2;

  const indicatorTranslateX = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [startX, endX],
    extrapolate: 'clamp',
  });

  // Opacity/Scale interpolation for the "jump" over the button?
  // Let's make it just slide through behind the button.
  
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

        {/* Animated Sliding Pill Indicator */}
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(23, 162, 184, 0.2)', 'rgba(23, 162, 184, 0.05)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </Animated.View>

        {/* Content Container */}
        <View style={styles.tabContainer}>
          {/* Left Tab (Hosts) */}
          <TouchableOpacity
            onPress={() => onTabPress(0, 'Hosts')}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
             <View style={styles.iconWrapper}>
                <Ionicons
                  name={activeIndex === 0 ? 'grid' : 'grid-outline'}
                  size={24}
                  color={activeIndex === 0 ? Colors.primary.main : Colors.text.tertiary}
                />
             </View>
          </TouchableOpacity>

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
          <TouchableOpacity
            onPress={() => onTabPress(1, 'Admin')}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
             <View style={styles.iconWrapper}>
                <Ionicons
                  name={activeIndex === 1 ? 'settings' : 'settings-outline'}
                  size={24}
                  color={activeIndex === 1 ? Colors.primary.main : Colors.text.tertiary}
                />
             </View>
          </TouchableOpacity>
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
  slidingIndicator: {
    position: 'absolute',
    top: (TAB_HEIGHT - 48) / 2, // Center vertically
    left: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    // Add a subtle glow to the pill itself
    shadowColor: Colors.primary.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    width: 48,
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
