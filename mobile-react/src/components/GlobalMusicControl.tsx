import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Animated, PanResponder, TouchableOpacity, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useMusic } from '../context/MusicContext';
import { Colors, Shadows } from '../constants/theme';

const HANDLE_WIDTH = 44;
const CONTROL_WIDTH = 90;

export const GlobalMusicControl: React.FC = () => {
  const { isMuted, toggleMute } = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 0 = Collapsed, 1 = Expanded
  const expandAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -20) {
          // Swipe Left -> Expand
          setIsExpanded(true);
        } else if (gestureState.dx > 20) {
          // Swipe Right -> Collapse
          setIsExpanded(false);
        } else {
          // Tap action handled by TouchableOpacity
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40
    }).start();
  }, [isExpanded]);

  const translateX = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CONTROL_WIDTH, 0] 
  });

  const opacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1]
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX }] }
      ]}
      {...panResponder.panHandlers}
    >
      {/* Handle (Visible when collapsed) */}
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={() => setIsExpanded(!isExpanded)}
        style={[styles.handleContainer, isMuted ? styles.handleMuted : styles.handleActive]}
      >
        <Ionicons 
            name={isMuted ? "musical-note" : "musical-notes"} 
            size={20} 
            color="#FFF" 
            style={{ opacity: isMuted ? 0.7 : 1 }}
        />
        {!isExpanded && isMuted && (
           <View style={styles.slashLine} />
        )}
      </TouchableOpacity>

      {/* Controls (Visible when expanded) */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
            onPress={() => {
                toggleMute();
                // Optional: auto-collapse after interaction
                // setIsExpanded(false); 
            }} 
            style={styles.toggleButton}
        >
            <Text style={styles.toggleText}>
                {isMuted ? "TURN ON" : "TURN OFF"}
            </Text>
            <Ionicons 
                name={isMuted ? "volume-high" : "volume-mute"} 
                size={16} 
                color={Colors.text.primary} 
                style={{ marginLeft: 6 }}
            />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 160, // Positioning it somewhat near the top-middle
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
    ...Shadows.lg,
  },
  handleContainer: {
    width: HANDLE_WIDTH,
    height: 44,
    backgroundColor: Colors.primary.main,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4, // Optical adjustment
  },
  handleActive: {
    backgroundColor: Colors.primary.main,
  },
  handleMuted: {
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRightWidth: 0,
  },
  slashLine: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: '#FFF',
    transform: [{ rotate: '45deg' }],
    opacity: 0.8,
  },
  controlsContainer: {
    width: CONTROL_WIDTH,
    height: 44,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: Colors.border.light,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toggleText: {
    color: Colors.text.primary,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.5,
  }
});
