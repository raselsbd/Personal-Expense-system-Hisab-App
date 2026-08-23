import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { palette, semantic } from './colors';

const fontConfig = {
  fontFamily: 'System',
};

export const appLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: semantic.light.primary,
    primaryContainer: semantic.light.primaryContainer,
    onPrimary: semantic.light.onPrimary,
    onPrimaryContainer: semantic.light.onPrimaryContainer,
    secondary: palette.emerald600,
    background: semantic.light.background,
    surface: semantic.light.surface,
    surfaceVariant: semantic.light.surfaceVariant,
    onSurface: semantic.light.onSurface,
    onSurfaceVariant: semantic.light.onSurfaceVariant,
    outline: semantic.light.border,
    error: palette.rose600,
  },
  roundness: 16,
};

export const appDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: semantic.dark.primary,
    primaryContainer: semantic.dark.primaryContainer,
    onPrimary: semantic.dark.onPrimary,
    onPrimaryContainer: semantic.dark.onPrimaryContainer,
    secondary: palette.emerald400,
    background: semantic.dark.background,
    surface: semantic.dark.surface,
    surfaceVariant: semantic.dark.surfaceVariant,
    onSurface: semantic.dark.onSurface,
    onSurfaceVariant: semantic.dark.onSurfaceVariant,
    outline: semantic.dark.border,
    error: palette.rose400,
  },
  roundness: 16,
};

export type AppTheme = typeof appLightTheme;
