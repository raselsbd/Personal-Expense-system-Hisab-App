import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { semantic } from '../theme/colors';
import { getCostStatusLabel } from '../utils/costStatus';
import type { CostStatus } from '../types';

interface Props {
  status: CostStatus;
  subtitle?: string;
}

const ICONS: Record<CostStatus, string> = {
  good: 'check-circle',
  major: 'alert-circle',
  critical: 'alert-octagon',
};

export function CostStatusBadge({ status, subtitle }: Props) {
  const theme = useTheme();
  const colors = theme.dark ? semantic.dark : semantic.light;
  const color = colors[status];
  const bg = colors[`${status}Container` as const];

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={ICONS[status] as any} size={18} color={color} />
      <View style={styles.textWrap}>
        <Text style={{ color, fontWeight: '700' }} variant="labelLarge">
          {getCostStatusLabel(status)}
        </Text>
        {subtitle ? (
          <Text style={{ color, opacity: 0.8 }} variant="labelSmall">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  textWrap: { gap: 1 },
});
