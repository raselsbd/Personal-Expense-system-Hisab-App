import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FAB, Portal, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/ScreenContainer';
import { StatCard } from '../../components/StatCard';
import { CostStatusBadge } from '../../components/CostStatusBadge';
import { SectionHeader } from '../../components/SectionHeader';
import { TransactionRow } from '../../components/TransactionRow';
import { TaskRow } from '../../components/TaskRow';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { palette, semantic } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import { currentMonthRange } from '../../utils/dateUtils';
import { getCostStatus } from '../../utils/costStatus';
import { getEffectiveMonthlyThreshold } from '../../db/monthlyThresholdRepo';
import {
  getAllPersonalTransactions,
  getCurrentBalance,
  getLifetimeCost,
  getLifetimeIncome,
  getSumByTypeInRange,
} from '../../db/personalRepo';
import { getUpcomingTasks, setTaskCompleted } from '../../db/taskRepo';
import { generateDueRecurringTransactions } from '../../db/recurringRepo';
import { getOutstandingLoanTotal } from '../../db/loanRepo';
import { cancelScheduledNotification } from '../../utils/notifications';
import { checkMonthlyThresholdAlert } from '../../utils/thresholdAlert';
import type { HomeStackParamList } from '../../navigation/types';
import type { PersonalTransaction, TaskItem } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { t, lang } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const [lifetimeIncome, setLifetimeIncome] = useState(0);
  const [lifetimeCost, setLifetimeCost] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [effectiveThreshold, setEffectiveThreshold] = useState(0);
  const [lentTotal, setLentTotal] = useState(0);
  const [borrowedTotal, setBorrowedTotal] = useState(0);
  const [recent, setRecent] = useState<PersonalTransaction[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskItem[]>([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    await generateDueRecurringTransactions();
    const { start, end } = currentMonthRange();
    const [life, lifeCost, mi, me, bal, tx, tasks, threshold, lent, borrowed] = await Promise.all([
      getLifetimeIncome(),
      getLifetimeCost(),
      getSumByTypeInRange('income', start, end),
      getSumByTypeInRange('expense', start, end),
      getCurrentBalance(),
      getAllPersonalTransactions(),
      getUpcomingTasks(4),
      getEffectiveMonthlyThreshold(start.slice(0, 7), settings?.monthlyThreshold ?? 0),
      getOutstandingLoanTotal('lent'),
      getOutstandingLoanTotal('borrowed'),
    ]);
    setLifetimeIncome(life);
    setLifetimeCost(lifeCost);
    setMonthIncome(mi);
    setMonthExpense(me);
    setBalance(bal);
    setRecent(tx.slice(0, 5));
    setUpcomingTasks(tasks);
    setEffectiveThreshold(threshold);
    setLentTotal(lent);
    setBorrowedTotal(borrowed);
    checkMonthlyThresholdAlert();
  }, [settings?.monthlyThreshold]);

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

  const handleToggleTask = async (task: TaskItem) => {
    await setTaskCompleted(task.id, !task.completed);
    if (!task.completed && task.notificationId) {
      await cancelScheduledNotification(task.notificationId);
    }
    load();
  };

  const handleTransactionPress = (transaction: PersonalTransaction) => {
    if (transaction.source !== 'manual') return;
    navigation.navigate('AddTransaction', { transactionId: transaction.id, type: transaction.type });
  };

  if (!settings) return null;

  const status = getCostStatus(
    monthExpense,
    effectiveThreshold,
    settings.majorThresholdPct,
    settings.criticalThresholdPct
  );

  const personalEfficiencyPct = lifetimeIncome > 0 ? ((lifetimeIncome - lifetimeCost) / lifetimeIncome) * 100 : 0;

  return (
    <ScreenContainer onRefresh={onRefresh} refreshing={loading}>
      <View>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {settings.profileName ? `${t('welcomeBack')}, ${settings.profileName}` : t('welcomeBack')}
        </Text>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {t('personalOverview')}
        </Text>
      </View>

      <Pressable style={styles.balanceCardWrap} onPress={() => navigation.navigate('Accounts')}>
        <LinearGradient
          colors={theme.dark ? [palette.indigo400, palette.indigo700] : [palette.indigo600, palette.indigo700]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
        <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, opacity: 0.85 }}>
          {t('currentBalance')}
        </Text>
        <Text variant="displaySmall" style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>
          {formatCurrency(balance, settings.currencySymbol)}
        </Text>
        <View style={styles.balanceFooterRow}>
          <View style={styles.balanceFooterItem}>
            <MaterialCommunityIcons name="arrow-down-circle" size={16} color={theme.colors.onPrimary} />
            <Text style={{ color: theme.colors.onPrimary }} variant="bodySmall">
              {t('thisMonthIn')} {formatCurrency(monthIncome, settings.currencySymbol)}
            </Text>
          </View>
          <View style={styles.balanceFooterItem}>
            <MaterialCommunityIcons name="arrow-up-circle" size={16} color={theme.colors.onPrimary} />
            <Text style={{ color: theme.colors.onPrimary }} variant="bodySmall">
              {t('outWord')} {formatCurrency(monthExpense, settings.currencySymbol)}
            </Text>
          </View>
        </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.statsRow}>
        <StatCard
          label={t('lifetimeIncome')}
          value={formatCurrency(lifetimeIncome, settings.currencySymbol)}
          icon="trending-up"
          accentColor={colors.income}
          accentBg={colors.incomeContainer}
          onPress={() => navigation.navigate('TransactionsList', { type: 'income' })}
        />
        <StatCard
          label={t('lifetimeCost')}
          value={formatCurrency(lifetimeCost, settings.currencySymbol)}
          icon="trending-down"
          accentColor={colors.expense}
          accentBg={colors.expenseContainer}
          onPress={() => navigation.navigate('TransactionsList', { type: 'expense' })}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label={t('monthIncome')}
          value={formatCurrency(monthIncome, settings.currencySymbol)}
          icon="cash-plus"
          accentColor={colors.income}
          accentBg={colors.incomeContainer}
          onPress={() => navigation.navigate('TransactionsList', { type: 'income', rangeMode: 'thisMonth' })}
        />
        <StatCard
          label={t('monthCost')}
          value={formatCurrency(monthExpense, settings.currencySymbol)}
          icon="cash-minus"
          accentColor={colors.expense}
          accentBg={colors.expenseContainer}
          onPress={() => navigation.navigate('TransactionsList', { type: 'expense', rangeMode: 'thisMonth' })}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label={t('dueCardTitle')}
          value={formatCurrency(lentTotal, settings.currencySymbol)}
          icon="hand-coin-outline"
          accentColor={colors.income}
          accentBg={colors.incomeContainer}
          onPress={() => navigation.navigate('LoansList', { direction: 'lent' })}
        />
        <StatCard
          label={t('payableCardTitle')}
          value={formatCurrency(borrowedTotal, settings.currencySymbol)}
          icon="cash-refund"
          accentColor={colors.expense}
          accentBg={colors.expenseContainer}
          onPress={() => navigation.navigate('LoansList', { direction: 'borrowed' })}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label={t('personalEfficiency')}
          value={`${personalEfficiencyPct.toFixed(1)}%`}
          icon="speedometer"
          accentColor={personalEfficiencyPct >= 0 ? colors.income : colors.expense}
          accentBg={personalEfficiencyPct >= 0 ? colors.incomeContainer : colors.expenseContainer}
          onPress={() => navigation.navigate('TransactionsList')}
        />
      </View>

      <Pressable onPress={() => navigation.navigate('TransactionsList', { type: 'expense', rangeMode: 'thisMonth' })}>
        <CostStatusBadge
          status={status}
          subtitle={`${formatCurrency(effectiveThreshold, settings.currencySymbol)} ${t('limitWord')}`}
        />
      </Pressable>

      <View>
        <SectionHeader
          title={t('upcomingDeadlines')}
          action={
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.primary }}
              onPress={() => navigation.getParent()?.navigate('TasksTab' as never)}
            >
              {t('viewAll')}
            </Text>
          }
        />
        {upcomingTasks.length === 0 ? (
          <EmptyState icon="calendar-check" title={t('noUpcomingDeadlines')} />
        ) : (
          <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            {upcomingTasks.map((tsk) => (
              <TaskRow key={tsk.id} task={tsk} onToggle={() => handleToggleTask(tsk)} />
            ))}
          </View>
        )}
      </View>

      <View>
        <SectionHeader
          title={t('recentTransactions')}
          action={
            <View style={styles.headerActionsRow}>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.primary }}
                onPress={() => navigation.navigate('TransactionsList')}
              >
                {t('viewAll')}
              </Text>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.primary }}
                onPress={() => navigation.navigate('AddTransaction')}
              >
                {t('add')}
              </Text>
            </View>
          }
        />
        {recent.length === 0 ? (
          <EmptyState icon="wallet-outline" title={t('noTransactionsYet')} subtitle={t('addFirstIncomeOrCost')} />
        ) : (
          <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                currencySymbol={settings.currencySymbol}
                lang={lang}
                onPress={tx.source === 'manual' ? () => handleTransactionPress(tx) : undefined}
              />
            ))}
          </View>
        )}
      </View>

      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          color={theme.colors.onPrimary}
          style={{ paddingBottom: insets.bottom + 24 }}
          fabStyle={{ backgroundColor: theme.colors.primary }}
          actions={[
            {
              icon: 'cash-plus',
              label: t('addIncome'),
              color: colors.income,
              onPress: () => navigation.navigate('AddTransaction', { type: 'income' }),
            },
            {
              icon: 'cash-minus',
              label: t('addCost'),
              color: colors.expense,
              onPress: () => navigation.navigate('AddTransaction', { type: 'expense' }),
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
        />
      </Portal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  balanceCardWrap: {
    borderRadius: 22,
    shadowColor: palette.indigo700,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  balanceCard: { borderRadius: 22, padding: 20, gap: 6 },
  balanceFooterRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  balanceFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsRow: { flexDirection: 'row', gap: 12 },
  headerActionsRow: { flexDirection: 'row', gap: 16 },
  listCard: { borderRadius: 18, borderWidth: 1, padding: 12 },
});
