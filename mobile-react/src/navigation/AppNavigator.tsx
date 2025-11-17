import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SetupScreen } from '../screens/SetupScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { HostListScreen } from '../screens/HostListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { AddHostScreen } from '../screens/AddHostScreen';
import { PublicHostScreen } from '../screens/PublicHostScreen';
import { LoadingScreen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { PublicHostConfig } from '../types';
import { storage } from '../utils/storage';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <SafeAreaView edges={['bottom']} style={styles.tabBarSafeArea}>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBarWrapper}>
          {/* Blur as background layer with clipping container */}
          <View style={styles.tabBarBlurContainer}>
            <BlurView
              style={styles.tabBarBlurLayer}
              blurType="dark"
              blurAmount={Platform.OS === 'ios' ? 5 : 15}
              blurRadius={Platform.OS === 'android' ? 15 : undefined}
              overlayColor={Platform.OS === 'android' ? 'rgba(36, 36, 38, 0.80)' : undefined}
              reducedTransparencyFallbackColor={Colors.glass.background}
            />
            <View style={styles.tabBarOverlay} />
          </View>
          {/* Navigation content on top */}
          <View style={styles.tabBar}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const isAddButton = route.name === 'Add';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // Special render for Add button
            if (isAddButton) {
              return (
                <View key={route.key} style={styles.addButtonWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onPress}
                    style={styles.addButtonTouch}
                  >
                    <View style={styles.addButton}>
                      <Ionicons name="add" size={32} color="white" />
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }

            const Icon = options.tabBarIcon;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
              >
                {Icon && (
                  <Icon
                    color={isFocused ? Colors.primary.main : Colors.text.tertiary}
                    size={28}
                    focused={isFocused}
                  />
                )}
              </TouchableOpacity>
            );
          })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Dummy component for Add button
const AddScreen = () => null;

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Hosts"
        component={HostListScreen}
        options={{
          tabBarLabel: 'Hosts',
          tabBarIcon: ({ color, size, focused }: any) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={32}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AddHost');
          },
        })}
      />
      <Tab.Screen
        name="Admin"
        component={AdminScreen}
        options={{
          tabBarLabel: 'Admin',
          tabBarIcon: ({ color, size, focused }: any) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={32}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, serverConfig } = useAuth();
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [publicHostConfig, setPublicHostConfig] = useState<PublicHostConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Load saved public host config on mount only
  React.useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        const savedPublicHostConfig = await storage.getPublicHostConfig();
        if (savedPublicHostConfig) {
          console.log('[AppNavigator] Loaded saved public host config');
          setPublicHostConfig(savedPublicHostConfig);
        }
      } catch (error) {
        console.error('[AppNavigator] Failed to load saved config:', error);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    
    loadSavedConfig();
  }, []);

  // Show loading screen while initializing
  if (isLoading || isLoadingConfig) {
    return <LoadingScreen />;
  }

  // If no server config, no serverUrl, and no publicHostConfig, show setup
  const needsSetup = !serverConfig && !serverUrl && !publicHostConfig;
  
  // Get the server URL from either serverConfig or local state
  const currentServerUrl = serverConfig?.serverUrl || serverUrl || '';

  // Handler for public host setup completion
  const handlePublicHostComplete = async (config: PublicHostConfig) => {
    // Save to storage
    await storage.savePublicHostConfig(config);
    setPublicHostConfig(config);
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {needsSetup ? (
          <Stack.Screen name="Setup">
            {() => (
              <SetupScreen
                onComplete={setServerUrl}
                onPublicHostComplete={handlePublicHostComplete}
              />
            )}
          </Stack.Screen>
        ) : publicHostConfig ? (
          // Public host mode - show public host screen directly
          <Stack.Screen name="PublicHost">
            {() => (
              <PublicHostScreen 
                route={{ params: { publicHostConfig } } as any} 
                navigation={undefined as any}
                onConfigRemoved={() => setPublicHostConfig(null)}
              />
            )}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Login">
            {() => <LoginScreen serverUrl={currentServerUrl} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="AddHost" 
              component={AddHostScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  // Tab Bar
  tabBarSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBarContainer: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  tabBarWrapper: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'visible',
  },
  tabBarBlurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: 'hidden',
    zIndex: -1,
  },
  tabBarBlurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36, 36, 38, 0)',
  },
  tabBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    borderRadius: 24,
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  
  // Add Button (Center)
  addButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  addButtonTouch: {
    marginTop: 0,
  },
  addButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.main,
  },
});
