import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { StatCard } from '../../components/StatCard';
import { ProjectCard } from '../../components/ProjectCard';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import { getAllProjectsWithStats } from '../../db/projectRepo';
import type { ProjectsStackParamList } from '../../navigation/types';
import type { ProjectStatus, ProjectWithStats } from '../../types';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'ProjectsList'>;

type StatusFilter = 'all' | ProjectStatus;

export default function ProjectsListScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const data = await getAllProjectsWithStats();
    setProjects(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setLoading(true);
    await load();
    setLoading(false);
  };

  if (!settings) return null;

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const totalBenefit = projects.reduce((sum, p) => sum + p.netBenefit, 0);
  const totalSpent = projects.reduce((sum, p) => sum + p.totalSpent, 0);
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalDue = projects.reduce((sum, p) => sum + p.effectiveDue, 0);
  const efficiencyPct = totalBudget > 0 ? (totalBenefit / totalBudget) * 100 : 0;
  const filteredProjects =
    statusFilter === 'all' ? projects : projects.filter((p) => p.status === statusFilter);

  return (
    <View style={{ flex: 1 }}>
      <ScreenContainer onRefresh={onRefresh} refreshing={loading}>
        <View>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {projects.length} {t('totalProjectsActive')} · {activeCount} {t('activeWord')}
          </Text>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            {t('projects')}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label={t('totalSpent')}
            value={formatCurrency(totalSpent, settings.currencySymbol)}
            icon="cash-minus"
            accentColor={colors.expense}
            accentBg={colors.expenseContainer}
          />
          <StatCard
            label={t('totalBenefit')}
            value={formatCurrency(totalBenefit, settings.currencySymbol)}
            icon="chart-line"
            accentColor={colors.income}
            accentBg={colors.incomeContainer}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label={t('dueCardTitle')}
            value={formatCurrency(totalDue, settings.currencySymbol)}
            icon="clock-alert-outline"
            accentColor={colors.major}
            accentBg={colors.majorContainer}
            onPress={() => navigation.navigate('ProjectsDue')}
          />
          <StatCard
            label={t('efficiency')}
            value={`${efficiencyPct.toFixed(1)}%`}
            icon="speedometer"
            accentColor={efficiencyPct >= 0 ? colors.income : colors.expense}
            accentBg={efficiencyPct >= 0 ? colors.incomeContainer : colors.expenseContainer}
          />
        </View>

        <SegmentedButtons
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          buttons={[
            { value: 'all', label: t('allProjects') },
            { value: 'active', label: t('activeProjects') },
            { value: 'completed', label: t('completedProjects') },
          ]}
        />

        {filteredProjects.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title={statusFilter === 'completed' ? t('noCompletedProjectsYet') : t('noProjectsYet')}
            subtitle={statusFilter === 'completed' ? undefined : t('addProjectSubtitle')}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {filteredProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                currencySymbol={settings.currencySymbol}
                onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })}
              />
            ))}
          </View>
        )}
      </ScreenContainer>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 24 }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddProject')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 12 },
  fab: { position: 'absolute', right: 16, borderRadius: 16 },
});
