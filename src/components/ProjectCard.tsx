import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { semantic } from '../theme/colors';
import { formatCurrency } from '../utils/currency';
import type { ProjectWithStats } from '../types';

interface Props {
  project: ProjectWithStats;
  currencySymbol: string;
  onPress: () => void;
}

export function ProjectCard({ project, currencySymbol, onPress }: Props) {
  const theme = useTheme();
  const colors = theme.dark ? semantic.dark : semantic.light;
  const spentRatio = project.budget > 0 ? Math.min(project.totalSpent / project.budget, 1) : 0;
  const isProfit = project.netBenefit >= 0;
  const progressColor = spentRatio >= 1 ? colors.critical : spentRatio >= 0.7 ? colors.major : colors.good;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
      onPress={onPress}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }} numberOfLines={1}>
            {project.name}
          </Text>
          {project.client ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {project.client}
            </Text>
          ) : null}
        </View>
        {project.status === 'completed' ? (
          <View style={[styles.statusPill, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="check-circle" size={12} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Settled
            </Text>
          </View>
        ) : (
          <View style={[styles.statusPill, { backgroundColor: colors.goodContainer }]}>
            <Text variant="labelSmall" style={{ color: colors.good }}>
              Active
            </Text>
          </View>
        )}
      </View>

      <ProgressBar progress={spentRatio} color={progressColor} style={styles.progress} />

      <View style={styles.footerRow}>
        <View>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Budget
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            {formatCurrency(project.budget, currencySymbol)}
          </Text>
        </View>
        <View>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Spent
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            {formatCurrency(project.totalSpent, currencySymbol)}
          </Text>
        </View>
        <View>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {isProfit ? 'Benefit' : 'Over budget'}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: isProfit ? colors.income : colors.expense, fontWeight: '700' }}
          >
            {formatCurrency(Math.abs(project.netBenefit), currencySymbol)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  titleWrap: { flex: 1, gap: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  progress: { height: 8, borderRadius: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
