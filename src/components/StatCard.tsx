import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  label: string;
  value: string;
  icon?: string;
  accentColor?: string;
  accentBg?: string;
  size?: 'large' | 'small';
  onPress?: () => void;
}

export function StatCard({ label, value, icon, accentColor, accentBg, size = 'small', onPress }: Props) {
  const theme = useTheme();
  const color = accentColor ?? theme.colors.primary;
  const bg = accentBg ?? theme.colors.primaryContainer;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.headerRow}>
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: bg }]}>
            <MaterialCommunityIcons name={icon as any} size={16} color={color} />
          </View>
        ) : null}
      </View>
      <Text
        variant={size === 'large' ? 'headlineMedium' : 'titleLarge'}
        style={{ color: theme.colors.onSurface, fontWeight: '700' }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
