import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SetupScreen } from '../screens/SetupScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { HostListScreen } from '../screens/HostListScreen';
import { LoadingScreen } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, serverConfig } = useAuth();
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  // Show loading screen while initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If no server config and no serverUrl set, show setup
  const needsSetup = !serverConfig && !serverUrl;

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
            {() => <SetupScreen onComplete={setServerUrl} />}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="HostList" component={HostListScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
