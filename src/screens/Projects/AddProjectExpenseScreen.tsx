import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { DateField } from '../../components/DateField';
import { ReceiptPicker } from '../../components/ReceiptPicker';
import {
  addProjectExpense,
  deleteProjectExpense,
  getProjectExpenseById,
  updateProjectExpense,
} from '../../db/projectRepo';
import { dateToIsoDate, isoDateToDate } from '../../utils/dateUtils';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import type { ProjectsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'AddProjectExpense'>;

export default function AddProjectExpenseScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const { projectId, expenseId } = route.params;
  const isEditing = !!expenseId;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    if (!expenseId) return;
    (async () => {
      const existing = await getProjectExpenseById(expenseId);
      if (existing) {
        setAmount(String(existing.amount));
        setNote(existing.note);
        setDate(isoDateToDate(existing.date));
        setPhotoUri(existing.photoUri);
      }
      setLoading(false);
    })();
  }, [expenseId]);

  const amountValue = parseFloat(amount);
  const canSave = !isNaN(amountValue) && amountValue > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isEditing && expenseId) {
        await updateProjectExpense(expenseId, {
          amount: amountValue,
          note,
          date: dateToIsoDate(date),
          photoUri,
        });
      } else {
        await addProjectExpense({
          projectId,
          amount: amountValue,
          note,
          date: dateToIsoDate(date),
          photoUri,
        });
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expenseId) return;
    await deleteProjectExpense(expenseId);
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
        {isEditing ? t('editCostEntry') : t('addProjectCost')}
      </Text>

      <TextInput
        label={t('amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        mode="outlined"
        left={<TextInput.Affix text={settings.currencySymbol} />}
        autoFocus
      />
      <TextInput label={t('noteOptional')} value={note} onChangeText={setNote} mode="outlined" />
      <ReceiptPicker value={photoUri} onChange={setPhotoUri} />
      <DateField label={t('dateWord')} value={date} onChange={setDate} maximumDate={new Date()} />

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!canSave || saving}
        loading={saving}
        style={{ borderRadius: 14, marginTop: 8 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {isEditing ? t('save') : t('addCostBtn')}
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
