import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HomeStack } from './HomeStack';
import { ProjectsStack } from './ProjectsStack';
import { TasksStack } from './TasksStack';
import { ReportsStack } from './ReportsStack';
import { SettingsStack } from './SettingsStack';
import { useTranslation } from '../i18n/useTranslation';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, string> = {
  HomeTab: 'view-dashboard',
  ProjectsTab: 'briefcase-variant',
  TasksTab: 'checkbox-marked-circle-outline',
  ReportsTab: 'chart-donut',
  SettingsTab: 'cog-outline',
};

export function MainTabs() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={ICONS[route.name as keyof MainTabParamList] as any} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: t('tabHome') }} />
      <Tab.Screen name="ProjectsTab" component={ProjectsStack} options={{ title: t('projects') }} />
      <Tab.Screen name="TasksTab" component={TasksStack} options={{ title: t('tabTasks') }} />
      <Tab.Screen name="ReportsTab" component={ReportsStack} options={{ title: t('reports') }} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} options={{ title: t('settings') }} />
    </Tab.Navigator>
  );
}
