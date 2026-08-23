import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import AddTransactionScreen from '../screens/Dashboard/AddTransactionScreen';
import TransactionsListScreen from '../screens/Transactions/TransactionsListScreen';
import LoansListScreen from '../screens/Dashboard/LoansListScreen';
import AddLoanScreen from '../screens/Dashboard/AddLoanScreen';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="TransactionsList" component={TransactionsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LoansList" component={LoansListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddLoan" component={AddLoanScreen} options={{ title: '', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
