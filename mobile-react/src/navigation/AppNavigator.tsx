import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SetupScreen } from '../screens/SetupScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { HostListScreen } from '../screens/HostListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { AddHostScreen } from '../screens/AddHostScreen';
import { PublicHostScreen } from '../screens/PublicHostScreen';
import { WidgetManagementScreen } from '../screens/WidgetManagementScreen';
import { ServerSettingsScreen } from '../screens/ServerSettingsScreen';
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

const linking = {
  prefixes: ['wolmanager://'],
  config: {
    screens: {
      WidgetManagement: 'widget-config/:widgetId',
    },
  },
};

import { MainScreen } from '../screens/MainScreen';

// Main Tab Navigator removed in favor of MainScreen with custom swipe handling

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
    <NavigationContainer linking={linking}>
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
            <Stack.Screen name="Main" component={MainScreen} />
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
            <Stack.Screen 
              name="WidgetManagement" 
              component={WidgetManagementScreen}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="ServerSettings" 
              component={ServerSettingsScreen}
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({});
