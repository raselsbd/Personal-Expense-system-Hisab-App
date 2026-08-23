import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';

import ProjectsListScreen from '../screens/Projects/ProjectsListScreen';
import ProjectDetailScreen from '../screens/Projects/ProjectDetailScreen';
import ProjectsDueScreen from '../screens/Projects/ProjectsDueScreen';
import AddProjectScreen from '../screens/Projects/AddProjectScreen';
import AddProjectExpenseScreen from '../screens/Projects/AddProjectExpenseScreen';
import AddProjectPaymentScreen from '../screens/Projects/AddProjectPaymentScreen';
import type { ProjectsStackParamList } from './types';

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export function ProjectsStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="ProjectsList" component={ProjectsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: 'Project' }} />
      <Stack.Screen name="ProjectsDue" component={ProjectsDueScreen} options={{ title: '' }} />
      <Stack.Screen name="AddProject" component={AddProjectScreen} options={{ title: '', presentation: 'modal' }} />
      <Stack.Screen
        name="AddProjectExpense"
        component={AddProjectExpenseScreen}
        options={{ title: '', presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddProjectPayment"
        component={AddProjectPaymentScreen}
        options={{ title: '', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
