// Central color tokens. Keep light/dark in sync by role, not by raw hex reuse.

export const palette = {
  indigo50: '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo400: '#818CF8',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',

  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',

  rose400: '#FB7185',
  rose500: '#F43F5E',
  rose600: '#E11D48',

  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',

  white: '#FFFFFF',
  black: '#000000',
};

export const semantic = {
  light: {
    primary: palette.indigo600,
    primaryContainer: palette.indigo50,
    onPrimary: palette.white,
    onPrimaryContainer: palette.indigo700,

    background: palette.slate50,
    surface: palette.white,
    surfaceVariant: palette.slate100,
    onSurface: palette.slate900,
    onSurfaceVariant: palette.slate500,
    border: palette.slate200,

    income: palette.emerald600,
    incomeContainer: '#ECFDF5',
    expense: palette.rose600,
    expenseContainer: '#FFF1F2',

    good: palette.emerald600,
    goodContainer: '#ECFDF5',
    major: palette.amber600,
    majorContainer: '#FFFBEB',
    critical: palette.rose600,
    criticalContainer: '#FFF1F2',
  },
  dark: {
    primary: palette.indigo400,
    primaryContainer: palette.indigo700,
    onPrimary: palette.slate950,
    onPrimaryContainer: palette.indigo50,

    background: palette.slate950,
    surface: palette.slate900,
    surfaceVariant: palette.slate800,
    onSurface: palette.slate50,
    onSurfaceVariant: palette.slate400,
    border: palette.slate700,

    income: palette.emerald400,
    incomeContainer: '#064E3B',
    expense: palette.rose400,
    expenseContainer: '#4C0519',

    good: palette.emerald400,
    goodContainer: '#064E3B',
    major: palette.amber400,
    majorContainer: '#451A03',
    critical: palette.rose400,
    criticalContainer: '#4C0519',
  },
};

export type AppColors = typeof semantic.light;
