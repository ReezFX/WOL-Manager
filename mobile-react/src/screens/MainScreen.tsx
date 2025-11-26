import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
} from 'react-native';
import { HostListScreen } from './HostListScreen';
import { AdminScreen } from './AdminScreen';
import { NavDock } from '../components/NavDock';
import { Colors } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export const MainScreen: React.FC = () => {
  const navigation = useNavigation();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Screens to render
  const screens = [
    { key: 'hosts', component: HostListScreen, routeName: 'Hosts' },
    { key: 'admin', component: AdminScreen, routeName: 'Admin' },
  ];

  const handleTabPress = (index: number, routeName: string) => {
    if (routeName === 'Add') {
      navigation.navigate('AddHost' as never);
      return;
    }
    
    // Scroll to the selected screen
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = ({ item }: { item: typeof screens[0] }) => {
    const Component = item.component;
    return (
      <View style={{ width, flex: 1 }}>
        <Component navigation={navigation} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Animated.FlatList
        ref={flatListRef}
        data={screens}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        contentContainerStyle={styles.contentContainer}
      />

      {/* NavDock Overlay */}
      <NavDock
        scrollX={scrollX}
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
        screens={screens}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
