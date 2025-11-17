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
import { AddHostScreen } from '../screens/AddHostScreen';
import { LoadingScreen } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <SafeAreaView edges={['bottom']} style={styles.tabBarSafeArea}>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBarWrapper}>
          {/* Blur as background layer */}
          <BlurView
            style={styles.tabBarBlurLayer}
            blurType="dark"
            blurAmount={Platform.OS === 'ios' ? 20 : 10}
            blurRadius={Platform.OS === 'android' ? 10 : undefined}
            overlayColor={Platform.OS === 'android' ? 'transparent' : undefined}
            reducedTransparencyFallbackColor={Colors.glass.background}
          />
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
                    <LinearGradient
                      colors={Colors.primary.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.addButton}
                    >
                      <Ionicons name="add" size={28} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            }

            const Icon = options.tabBarIcon;
            const label = options.tabBarLabel;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
              >
                {Icon && (
                  <Icon
                    color={isFocused ? Colors.primary.main : Colors.text.tertiary}
                    size={24}
                    focused={isFocused}
                  />
                )}
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused && styles.tabLabelFocused,
                  ]}
                >
                  {label}
                </Text>
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
              size={size}
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
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }: any) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
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

  // Show loading screen while initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If no server config and no serverUrl set, show setup
  const needsSetup = !serverConfig && !serverUrl;
  
  // Get the server URL from either serverConfig or local state
  const currentServerUrl = serverConfig?.serverUrl || serverUrl || '';

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
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tabBarWrapper: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'visible',
    ...Shadows.xl,
  },
  tabBarBlurLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    zIndex: -1,
    overflow: 'hidden',
  },
  tabBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
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
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.medium,
    fontWeight: '500',
    marginTop: 4,
  },
  tabLabelFocused: {
    color: Colors.primary.light,
    fontWeight: '600',
  },
  
  // Add Button (Center)
  addButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  addButtonTouch: {
    marginTop: -28,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xl,
  },
});
