import React, { useRef } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponderGestureState,
} from 'react-native';
import { useNavigation, useTabAnimation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

interface SwipeableTabWrapperProps {
  children: React.ReactNode;
  leftRouteName?: string;
  rightRouteName?: string;
}

const SWIPE_THRESHOLD = 50;

export const SwipeableTabWrapper: React.FC<SwipeableTabWrapperProps> = ({
  children,
  leftRouteName,
  rightRouteName,
}) => {
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD && leftRouteName) {
          // Swipe Right -> Go Left
          navigation.navigate(leftRouteName);
        } else if (gestureState.dx < -SWIPE_THRESHOLD && rightRouteName) {
          // Swipe Left -> Go Right
          navigation.navigate(rightRouteName);
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
