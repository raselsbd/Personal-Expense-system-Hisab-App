import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, PieChart } from 'react-native-gifted-charts';

import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { EmptyState } from '../../components/EmptyState';
import { StatCard } from '../../components/StatCard';
import { DateField } from '../../components/DateField';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation, translateCategory } from '../../i18n/useTranslation';
import { semantic, palette } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import { currentMonthRange, dateToIsoDate, lastNMonthsRanges } from '../../utils/dateUtils';
import { getCategoryBreakdown, getMonthlyTotals, getSumByTypeInRange } from '../../db/personalRepo';
import { getAllProjectsWithStats } from '../../db/projectRepo';
import type { ProjectWithStats } from '../../types';

type Mode = 'personal' | 'projects';
type RangeMode = 'overall' | 'monthly' | 'custom';

const ALL_TIME_START = '0001-01-01';
const ALL_TIME_END = '9999-12-31';

const CATEGORY_COLORS = [
  palette.indigo500,
  palette.emerald500,
  palette.amber500,
  palette.rose500,
  palette.indigo400,
  palette.emerald400,
];

export default function ReportsScreen() {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t, lang } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;
  const [mode, setMode] = useState<Mode>('personal');
  const [rangeMode, setRangeMode] = useState<RangeMode>('monthly');
  const [customStart, setCustomStart] = useState(new Date());
  const [customEnd, setCustomEnd] = useState(new Date());

  const [monthly, setMonthly] = useState<{ label: string; income: number; expense: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ category: string; total: number }[]>([]);
  const [rangeIncome, setRangeIncome] = useState(0);
  const [rangeExpense, setRangeExpense] = useState(0);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);

  const selectedRange = useMemo((): { start: string; end: string } => {
    if (rangeMode === 'overall') return { start: ALL_TIME_START, end: ALL_TIME_END };
    if (rangeMode === 'monthly') return currentMonthRange();
    return { start: dateToIsoDate(customStart), end: dateToIsoDate(customEnd) };
  }, [rangeMode, customStart, customEnd]);

  const load = useCallback(async () => {
    const ranges = lastNMonthsRanges(6);
    const [mt, projectsData] = await Promise.all([getMonthlyTotals(ranges), getAllProjectsWithStats()]);
    setMonthly(mt);
    setProjects(projectsData);
  }, []);

  const loadRangeData = useCallback(async () => {
    const [breakdown, income, expense] = await Promise.all([
      getCategoryBreakdown('expense', selectedRange.start, selectedRange.end),
      getSumByTypeInRange('income', selectedRange.start, selectedRange.end),
      getSumByTypeInRange('expense', selectedRange.start, selectedRange.end),
    ]);
    setCategoryData(breakdown);
    setRangeIncome(income);
    setRangeExpense(expense);
  }, [selectedRange.start, selectedRange.end]);

  useFocusEffect(
    useCallback(() => {
      load();
      loadRangeData();
    }, [load, loadRangeData])
  );

  if (!settings) return null;

  const barData = monthly.flatMap((m) => [
    { value: m.income, label: m.label, frontColor: colors.income, spacing: 2 },
    { value: m.expense, frontColor: colors.expense },
  ]);

  const pieData = categoryData.map((c, i) => ({
    value: c.total,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    text: c.category,
  }));

  const projectBarData = projects.slice(0, 6).flatMap((p) => [
    { value: p.budget, label: p.name.slice(0, 8), frontColor: colors.major },
    { value: p.totalSpent, frontColor: colors.expense },
  ]);

  return (
    <ScreenContainer>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {t('reports')}
      </Text>

      <SegmentedButtons
        value={mode}
        onValueChange={(v) => setMode(v as Mode)}
        buttons={[
          { value: 'personal', label: t('personal') },
          { value: 'projects', label: t('projects') },
        ]}
      />

      {mode === 'personal' ? (
        <>
          <View>
            <SectionHeader title={t('rangeSummary')} />
            <View style={{ gap: 12 }}>
              <SegmentedButtons
                value={rangeMode}
                onValueChange={(v) => setRangeMode(v as RangeMode)}
                buttons={[
                  { value: 'overall', label: t('overallWord') },
                  { value: 'monthly', label: t('monthlyWord') },
                  { value: 'custom', label: t('customWord') },
                ]}
              />
              {rangeMode === 'custom' ? (
                <View style={styles.rangeRow}>
                  <View style={{ flex: 1 }}>
                    <DateField
                      label={t('from')}
                      value={customStart}
                      onChange={setCustomStart}
                      maximumDate={customEnd}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateField label={t('to')} value={customEnd} onChange={setCustomEnd} maximumDate={new Date()} />
                  </View>
                </View>
              ) : null}
              <View style={styles.statsRow}>
                <StatCard
                  label={t('income')}
                  value={formatCurrency(rangeIncome, settings.currencySymbol)}
                  icon="cash-plus"
                  accentColor={colors.income}
                  accentBg={colors.incomeContainer}
                />
                <StatCard
                  label={t('cost')}
                  value={formatCurrency(rangeExpense, settings.currencySymbol)}
                  icon="cash-minus"
                  accentColor={colors.expense}
                  accentBg={colors.expenseContainer}
                />
                <StatCard
                  label={t('netWord')}
                  value={formatCurrency(rangeIncome - rangeExpense, settings.currencySymbol)}
                  icon="scale-balance"
                  accentColor={rangeIncome - rangeExpense >= 0 ? colors.income : colors.expense}
                  accentBg={rangeIncome - rangeExpense >= 0 ? colors.incomeContainer : colors.expenseContainer}
                />
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title={t('incomeVsCost6')} />
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              {monthly.every((m) => m.income === 0 && m.expense === 0) ? (
                <EmptyState icon="chart-bar" title={t('notEnoughData')} />
              ) : (
                <BarChart
                  data={barData}
                  barWidth={10}
                  spacing={18}
                  roundedTop
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
                  noOfSections={4}
                  height={180}
                />
              )}
            </View>
          </View>

          <View>
            <SectionHeader title={rangeMode === 'monthly' ? t('costByCategory') : t('costByCategoryGeneric')} />
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              {pieData.length === 0 ? (
                <EmptyState icon="chart-pie" title={t('noCostsThisMonth')} />
              ) : (
                <View style={styles.pieRow}>
                  <PieChart data={pieData} radius={70} innerRadius={40} />
                  <View style={styles.legend}>
                    {categoryData.map((c, i) => (
                      <View key={c.category} style={styles.legendRow}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] },
                          ]}
                        />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flex: 1 }} numberOfLines={1}>
                          {translateCategory(c.category, lang)}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatCurrency(c.total, settings.currencySymbol)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </>
      ) : (
        <>
          <View>
            <SectionHeader title={t('budgetVsSpent')} />
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              {projects.length === 0 ? (
                <EmptyState icon="chart-bar" title={t('noProjectsYet')} />
              ) : (
                <BarChart
                  data={projectBarData}
                  barWidth={10}
                  spacing={18}
                  roundedTop
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 9 }}
                  noOfSections={4}
                  height={180}
                />
              )}
            </View>
          </View>

          <View>
            <SectionHeader title={t('perProjectBenefit')} />
            {projects.length === 0 ? (
              <EmptyState icon="briefcase-outline" title={t('noProjectsYet')} />
            ) : (
              <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                {projects.map((p) => {
                  const isProfit = p.netBenefit >= 0;
                  return (
                    <View key={p.id} style={styles.projectRow}>
                      <Text style={{ color: theme.colors.onSurface, flex: 1 }} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={{ color: isProfit ? colors.income : colors.expense, fontWeight: '700' }}>
                        {isProfit ? '+' : '-'}
                        {formatCurrency(Math.abs(p.netBenefit), settings.currencySymbol)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14 },
  rangeRow: { flexDirection: 'row', gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
