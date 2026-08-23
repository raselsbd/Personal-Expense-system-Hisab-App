import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { initDatabase } from './src/db/database';
import { generateDueRecurringTransactions } from './src/db/recurringRepo';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { appLightTheme, appDarkTheme } from './src/theme/theme';
import { initNotificationChannel } from './src/utils/notifications';
import { MainTabs } from './src/navigation/MainTabs';
import LockScreen from './src/screens/Lock/LockScreen';

function AppShell() {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();
  const [unlocked, setUnlocked] = useState(false);
  const appState = useRef(AppState.currentState);

  const isDark = settings
    ? settings.themeMode === 'system'
      ? systemScheme === 'dark'
      : settings.themeMode === 'dark'
    : systemScheme === 'dark';

  const theme = isDark ? appDarkTheme : appLightTheme;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/active/) && next.match(/inactive|background/)) {
        if (settings?.appLockEnabled) setUnlocked(false);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [settings?.appLockEnabled]);

  if (!settings) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const locked = settings.appLockEnabled && !unlocked;

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {locked ? (
        <LockScreen settings={settings} onUnlock={() => setUnlocked(true)} />
      ) : (
        <NavigationContainer theme={isDark ? NavDarkTheme : NavDefaultTheme}>
          <MainTabs />
        </NavigationContainer>
      )}
    </PaperProvider>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initDatabase();
      await initNotificationChannel();
      await generateDueRecurringTransactions();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AppShell />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
