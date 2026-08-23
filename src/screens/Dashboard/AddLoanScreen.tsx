import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Dialog, Portal, SegmentedButtons, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { DateField } from '../../components/DateField';
import {
  addLoan,
  deleteLoan,
  getLoanById,
  setLoanReminderNotificationId,
  setLoanSettled,
  updateLoan,
} from '../../db/loanRepo';
import { cancelScheduledNotification, scheduleLoanDueReminder } from '../../utils/notifications';
import { dateToIsoDate, isoDateToDate } from '../../utils/dateUtils';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import type { HomeStackParamList } from '../../navigation/types';
import type { LoanDirection } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'AddLoan'>;

export default function AddLoanScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const loanId = route.params?.loanId;
  const isEditing = !!loanId;

  const [direction, setDirection] = useState<LoanDirection>(route.params?.direction ?? 'lent');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [settled, setSettled] = useState(false);
  const [existingSettled, setExistingSettled] = useState(false);
  const [existingReminderId, setExistingReminderId] = useState<string | null>(null);
  const [existingDueDateIso, setExistingDueDateIso] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    if (!loanId) return;
    (async () => {
      const existing = await getLoanById(loanId);
      if (existing) {
        setDirection(existing.direction);
        setPersonName(existing.personName);
        setAmount(String(existing.amount));
        setNote(existing.note);
        setDate(isoDateToDate(existing.date));
        setHasDueDate(!!existing.dueDate);
        if (existing.dueDate) setDueDate(isoDateToDate(existing.dueDate));
        setSettled(existing.settled);
        setExistingSettled(existing.settled);
        setExistingReminderId(existing.reminderNotificationId);
        setExistingDueDateIso(existing.dueDate);
      }
      setLoading(false);
    })();
  }, [loanId]);

  const amountValue = parseFloat(amount);
  const canSave = personName.trim().length > 0 && !isNaN(amountValue) && amountValue > 0;

  const syncReminder = async (id: string, name: string, dueDateIso: string | null) => {
    const dueDateChanged = dueDateIso !== existingDueDateIso;
    const reinstateAfterUnsettle = existingSettled && !settled;
    if (!dueDateChanged && !reinstateAfterUnsettle) return;
    if (existingReminderId) {
      await cancelScheduledNotification(existingReminderId);
    }
    if (dueDateIso) {
      const notificationId = await scheduleLoanDueReminder(id, name, direction, dueDateIso);
      await setLoanReminderNotificationId(id, notificationId);
    } else {
      await setLoanReminderNotificationId(id, null);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const dueDateIso = hasDueDate ? dateToIsoDate(dueDate) : null;

      if (isEditing && loanId) {
        await updateLoan(loanId, {
          personName: personName.trim(),
          amount: amountValue,
          note,
          date: dateToIsoDate(date),
          dueDate: dueDateIso,
        });
        await setLoanSettled(loanId, settled);
        if (!settled) {
          await syncReminder(loanId, personName.trim(), dueDateIso);
        }
      } else {
        const loan = await addLoan({
          direction,
          personName: personName.trim(),
          amount: amountValue,
          note,
          date: dateToIsoDate(date),
          dueDate: dueDateIso,
        });
        if (dueDateIso) {
          const notificationId = await scheduleLoanDueReminder(loan.id, loan.personName, direction, dueDateIso);
          if (notificationId) {
            await setLoanReminderNotificationId(loan.id, notificationId);
          }
        }
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!loanId) return;
    await deleteLoan(loanId);
    setDeleteDialogVisible(false);
    navigation.goBack();
  };

  if (loading || !settings) {
    return (
      <ScreenContainer>
        <View />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {isEditing ? t('editLoan') : t('addLoan')}
      </Text>

      {!isEditing ? (
        <SegmentedButtons
          value={direction}
          onValueChange={(v) => setDirection(v as LoanDirection)}
          buttons={[
            { value: 'lent', label: t('lentTab') },
            { value: 'borrowed', label: t('borrowedTab') },
          ]}
        />
      ) : null}

      <TextInput label={t('personNameLabel')} value={personName} onChangeText={setPersonName} mode="outlined" />
      <TextInput
        label={t('amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        mode="outlined"
        left={<TextInput.Affix text={settings.currencySymbol} />}
      />
      <TextInput label={t('noteOptional')} value={note} onChangeText={setNote} mode="outlined" />
      <DateField label={t('dateWord')} value={date} onChange={setDate} maximumDate={new Date()} />

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.onSurface }}>{t('loanDueToggleLabel')}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('loanDueToggleDesc')}
            </Text>
          </View>
          <Switch value={hasDueDate} onValueChange={setHasDueDate} />
        </View>
        {hasDueDate ? (
          <View style={{ marginTop: 12 }}>
            <DateField
              label={t('repaymentDateLabel')}
              value={dueDate}
              onChange={setDueDate}
              minimumDate={date}
            />
          </View>
        ) : null}
      </View>

      {isEditing ? (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={styles.switchRow}>
            <Text style={{ color: theme.colors.onSurface, flex: 1 }}>{t('markAsSettled')}</Text>
            <Switch value={settled} onValueChange={setSettled} />
          </View>
        </View>
      ) : null}

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!canSave || saving}
        loading={saving}
        style={{ borderRadius: 14, marginTop: 8 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {isEditing ? t('save') : t('addLoan')}
      </Button>

      {isEditing ? (
        <Button
          mode="outlined"
          textColor={colors.expense}
          icon="trash-can-outline"
          onPress={() => setDeleteDialogVisible(true)}
          style={{ borderRadius: 14, borderColor: colors.expense }}
        >
          {t('deleteEntry')}
        </Button>
      ) : null}

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>{t('deleteEntry')}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{t('deleteEntryConfirm')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>{t('cancel')}</Button>
            <Button onPress={handleDelete} textColor={colors.expense}>
              {t('delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
}

const styles = {
  card: { borderRadius: 18, borderWidth: 1, padding: 14 } as const,
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 } as const,
};
