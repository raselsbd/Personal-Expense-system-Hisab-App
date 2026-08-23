import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  IconButton,
  Portal,
  ProgressBar,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/ScreenContainer';
import { EmptyState } from '../../components/EmptyState';
import { DateField } from '../../components/DateField';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import { dateToIsoDate, formatDisplayDate, isoDateToDate } from '../../utils/dateUtils';
import { cancelScheduledNotification, schedulePaymentDueReminder } from '../../utils/notifications';
import {
  deleteProject,
  getProjectById,
  getProjectExpenses,
  getProjectPayments,
  settleProject,
  setProjectPaymentDueDate,
  setProjectPaymentReminderNotificationId,
} from '../../db/projectRepo';
import type { ProjectsStackParamList } from '../../navigation/types';
import type { ProjectExpense, ProjectPayment, ProjectWithStats } from '../../types';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'ProjectDetail'>;

type HistoryTab = 'cost' | 'payments';

export default function ProjectDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;
  const { projectId } = route.params;

  const [project, setProject] = useState<ProjectWithStats | null>(null);
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('cost');
  const [settleDialogVisible, setSettleDialogVisible] = useState(false);
  const [settling, setSettling] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [settleDateInput, setSettleDateInput] = useState(new Date());
  const [dueDateDialogVisible, setDueDateDialogVisible] = useState(false);
  const [dueDateInput, setDueDateInput] = useState(new Date());
  const [savingDueDate, setSavingDueDate] = useState(false);
  const [deleteProjectDialogVisible, setDeleteProjectDialogVisible] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const load = useCallback(async () => {
    const [p, ex, pay] = await Promise.all([
      getProjectById(projectId),
      getProjectExpenses(projectId),
      getProjectPayments(projectId),
    ]);
    if (p && p.status === 'active' && p.due <= 0 && p.paymentReminderNotificationId) {
      await cancelScheduledNotification(p.paymentReminderNotificationId);
      await setProjectPaymentReminderNotificationId(p.id, null);
      p.paymentReminderNotificationId = null;
    }
    setProject(p);
    setExpenses(ex);
    setPayments(pay);
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!project || !settings) return null;

  const spentRatio = project.budget > 0 ? Math.min(project.totalSpent / project.budget, 1) : 0;
  const receivedRatio = project.budget > 0 ? Math.min(project.totalReceived / project.budget, 1) : 0;
  const isProfit = project.netBenefit >= 0;
  const progressColor = spentRatio >= 1 ? colors.critical : spentRatio >= 0.7 ? colors.major : colors.good;

  const discountValue = Math.max(parseFloat(discountInput) || 0, 0);
  const previewNetBenefit = project.remaining - discountValue;
  const isPreviewProfit = previewNetBenefit >= 0;
  const previewDue = Math.max(project.due - discountValue, 0);

  const openSettleDialog = () => {
    setDiscountInput('');
    setSettleDateInput(new Date());
    setSettleDialogVisible(true);
  };

  const handleSettle = async () => {
    setSettling(true);
    try {
      await settleProject(project.id, discountValue, dateToIsoDate(settleDateInput));
      setSettleDialogVisible(false);
      await load();
    } finally {
      setSettling(false);
    }
  };

  const openDueDateDialog = () => {
    setDueDateInput(project.paymentDueDate ? isoDateToDate(project.paymentDueDate) : new Date());
    setDueDateDialogVisible(true);
  };

  const handleSaveDueDate = async () => {
    setSavingDueDate(true);
    try {
      if (project.paymentReminderNotificationId) {
        await cancelScheduledNotification(project.paymentReminderNotificationId);
      }
      const isoDate = dateToIsoDate(dueDateInput);
      await setProjectPaymentDueDate(project.id, isoDate);
      const notificationId = await schedulePaymentDueReminder(project.id, project.name, isoDate);
      await setProjectPaymentReminderNotificationId(project.id, notificationId);
      setDueDateDialogVisible(false);
      await load();
    } finally {
      setSavingDueDate(false);
    }
  };

  const handleClearDueDate = async () => {
    setSavingDueDate(true);
    try {
      if (project.paymentReminderNotificationId) {
        await cancelScheduledNotification(project.paymentReminderNotificationId);
      }
      await setProjectPaymentDueDate(project.id, null);
      await setProjectPaymentReminderNotificationId(project.id, null);
      setDueDateDialogVisible(false);
      await load();
    } finally {
      setSavingDueDate(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeletingProject(true);
    try {
      await deleteProject(project.id);
      setDeleteProjectDialogVisible(false);
      navigation.goBack();
    } finally {
      setDeletingProject(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            {project.name}
          </Text>
          {project.client ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {project.client}
            </Text>
          ) : null}
        </View>
        <IconButton
          icon="pencil-outline"
          onPress={() => navigation.navigate('AddProject', { projectId: project.id })}
        />
        <IconButton
          icon="trash-can-outline"
          iconColor={colors.expense}
          onPress={() => setDeleteProjectDialogVisible(true)}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('costWord')}
        </Text>
        <ProgressBar progress={spentRatio} color={progressColor} style={styles.progress} />
        <View style={styles.footerRow}>
          <View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('budget')}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {formatCurrency(project.budget, settings.currencySymbol)}
            </Text>
          </View>
          <View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('spent')}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {formatCurrency(project.totalSpent, settings.currencySymbol)}
            </Text>
          </View>
          <View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {isProfit ? t('netBenefit') : t('overBudget')}
            </Text>
            <Text
              variant="titleMedium"
              style={{ color: isProfit ? colors.income : colors.expense, fontWeight: '700' }}
            >
              {formatCurrency(Math.abs(project.netBenefit), settings.currencySymbol)}
            </Text>
          </View>
        </View>
        {project.status === 'completed' && project.discountAmount > 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('discountApplied')}: {formatCurrency(project.discountAmount, settings.currencySymbol)}
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('paymentWord')}
        </Text>
        <ProgressBar progress={receivedRatio} color={colors.income} style={styles.progress} />
        <View style={styles.footerRow}>
          <View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('budget')}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {formatCurrency(project.budget, settings.currencySymbol)}
            </Text>
          </View>
          <View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('received')}
            </Text>
            <Text variant="titleMedium" style={{ color: colors.income, fontWeight: '700' }}>
              {formatCurrency(project.totalReceived, settings.currencySymbol)}
            </Text>
          </View>
          <View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {project.effectiveDue > 0 ? t('due') : t('fullyReceived')}
            </Text>
            <Text
              variant="titleMedium"
              style={{ color: project.effectiveDue > 0 ? colors.major : colors.income, fontWeight: '700' }}
            >
              {formatCurrency(project.effectiveDue, settings.currencySymbol)}
            </Text>
          </View>
        </View>
        {project.status === 'completed' && project.discountAmount > 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('dueReducedByDiscount')}
          </Text>
        ) : null}
        {project.status === 'active' && project.due > 0 ? (
          <Button
            mode="text"
            icon="calendar-clock-outline"
            onPress={openDueDateDialog}
            style={{ alignSelf: 'flex-start' }}
            contentStyle={{ paddingHorizontal: 0 }}
          >
            {project.paymentDueDate
              ? `${t('paymentDueDateLabel')}: ${formatDisplayDate(project.paymentDueDate)}`
              : t('setPaymentDueDate')}
          </Button>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        {project.status === 'active' ? (
          <Button
            mode="contained"
            icon="cash-minus"
            style={{ flex: 1, borderRadius: 14 }}
            onPress={() => navigation.navigate('AddProjectExpense', { projectId: project.id })}
          >
            {t('addCostBtn')}
          </Button>
        ) : null}
        <Button
          mode="contained"
          icon="cash-plus"
          buttonColor={colors.income}
          style={{ flex: 1, borderRadius: 14 }}
          onPress={() => navigation.navigate('AddProjectPayment', { projectId: project.id })}
        >
          {t('addPayment')}
        </Button>
      </View>

      {project.status === 'active' ? (
        <Button
          mode="outlined"
          icon="briefcase-check-outline"
          style={{ borderRadius: 14 }}
          onPress={openSettleDialog}
        >
          {t('settleBtn')}
        </Button>
      ) : (
        <View style={[styles.settledBanner, { backgroundColor: colors.goodContainer }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color={colors.good} />
          <Text style={{ color: colors.good }}>
            {t('settledOn')} {project.settledAt ? formatDisplayDate(project.settledAt) : ''} ·{' '}
            {t('transferredToPersonal')}
          </Text>
        </View>
      )}

      <View>
        <SegmentedButtons
          value={historyTab}
          onValueChange={(v) => setHistoryTab(v as HistoryTab)}
          buttons={[
            { value: 'cost', label: t('costTab') },
            { value: 'payments', label: t('paymentsTab') },
          ]}
          style={{ marginBottom: 8 }}
        />
        {historyTab === 'cost' ? (
          expenses.length === 0 ? (
            <EmptyState icon="receipt" title={t('noCostsYet')} />
          ) : (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              {expenses.map((e) => (
                <Pressable
                  key={e.id}
                  style={styles.expenseRow}
                  onPress={() => navigation.navigate('AddProjectExpense', { projectId: project.id, expenseId: e.id })}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.expenseNoteRow}>
                      <Text style={{ color: theme.colors.onSurface }}>{e.note || t('costWord')}</Text>
                      {e.photoUri ? (
                        <MaterialCommunityIcons name="paperclip" size={14} color={theme.colors.onSurfaceVariant} />
                      ) : null}
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatDisplayDate(e.date)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.expense, fontWeight: '700' }}>
                    -{formatCurrency(e.amount, settings.currencySymbol)}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              ))}
            </View>
          )
        ) : payments.length === 0 ? (
          <EmptyState icon="cash-check" title={t('noPaymentsYet')} />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            {payments.map((p) => (
              <Pressable
                key={p.id}
                style={styles.expenseRow}
                onPress={() => navigation.navigate('AddProjectPayment', { projectId: project.id, paymentId: p.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.onSurface }}>{p.note || t('paymentWord')}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDisplayDate(p.date)}
                  </Text>
                </View>
                <Text style={{ color: colors.income, fontWeight: '700' }}>
                  +{formatCurrency(p.amount, settings.currencySymbol)}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Portal>
        <Dialog visible={settleDialogVisible} onDismiss={() => setSettleDialogVisible(false)}>
          <Dialog.Title>{t('settleDialogTitle')}</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {project.remaining >= 0
                ? `${t('settleProfitMsgPrefix')} ${formatCurrency(project.remaining, settings.currencySymbol)} ${t('settleProfitMsgSuffix')}`
                : `${t('settleLossMsgPrefix')} ${formatCurrency(Math.abs(project.remaining), settings.currencySymbol)} ${t('settleLossMsgSuffix')}`}
            </Text>
            <TextInput
              label={t('discountOptional')}
              value={discountInput}
              onChangeText={setDiscountInput}
              keyboardType="decimal-pad"
              mode="outlined"
              left={<TextInput.Affix text={settings.currencySymbol} />}
            />
            {discountValue > 0 ? (
              <View style={{ gap: 4 }}>
                <Text style={{ color: isPreviewProfit ? colors.income : colors.expense, fontWeight: '700' }}>
                  {t('netBenefit')}: {formatCurrency(Math.abs(previewNetBenefit), settings.currencySymbol)}
                </Text>
                {project.due > 0 ? (
                  <Text style={{ color: colors.major, fontWeight: '700' }}>
                    {t('due')}: {formatCurrency(previewDue, settings.currencySymbol)}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <DateField label={t('settleDateLabel')} value={settleDateInput} onChange={setSettleDateInput} maximumDate={new Date()} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSettleDialogVisible(false)}>{t('cancel')}</Button>
            <Button onPress={handleSettle} loading={settling}>
              {t('confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dueDateDialogVisible} onDismiss={() => setDueDateDialogVisible(false)}>
          <Dialog.Title>{t('paymentDueDateLabel')}</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <DateField label={t('paymentDueDateLabel')} value={dueDateInput} onChange={setDueDateInput} />
          </Dialog.Content>
          <Dialog.Actions>
            {project.paymentDueDate ? (
              <Button onPress={handleClearDueDate} textColor={colors.expense} loading={savingDueDate}>
                {t('clearDueDate')}
              </Button>
            ) : null}
            <Button onPress={() => setDueDateDialogVisible(false)}>{t('cancel')}</Button>
            <Button onPress={handleSaveDueDate} loading={savingDueDate}>
              {t('save')}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={deleteProjectDialogVisible} onDismiss={() => setDeleteProjectDialogVisible(false)}>
          <Dialog.Title>{t('deleteProject')}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{t('deleteProjectConfirm')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteProjectDialogVisible(false)}>{t('cancel')}</Button>
            <Button onPress={handleDeleteProject} textColor={colors.expense} loading={deletingProject}>
              {t('delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  progress: { height: 8, borderRadius: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionsRow: { flexDirection: 'row', gap: 12 },
  settledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12 },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  expenseNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
