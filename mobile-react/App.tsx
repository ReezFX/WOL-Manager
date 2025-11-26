import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { MusicProvider } from './src/context/MusicContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { GlobalMusicControl } from './src/components/GlobalMusicControl';
import { Colors } from './src/constants/theme';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.background.primary}
      />
      <ToastProvider>
        <MusicProvider>
          <AuthProvider>
            <AppNavigator />
            <GlobalMusicControl />
          </AuthProvider>
        </MusicProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
};

export default App;
