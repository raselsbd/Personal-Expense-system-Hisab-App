import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';

import SettingsHomeScreen from '../screens/Settings/SettingsHomeScreen';
import SetPinScreen from '../screens/Settings/SetPinScreen';
import RecurringTransactionsScreen from '../screens/Settings/RecurringTransactionsScreen';
import BackupRestoreScreen from '../screens/Settings/BackupRestoreScreen';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SetPin" component={SetPinScreen} options={{ title: '', presentation: 'modal' }} />
      <Stack.Screen
        name="RecurringTransactions"
        component={RecurringTransactionsScreen}
        options={{ title: '' }}
      />
      <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
