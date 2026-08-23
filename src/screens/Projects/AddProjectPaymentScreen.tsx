import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { DateField } from '../../components/DateField';
import {
  addPostSettlementPayment,
  addProjectPayment,
  deleteProjectPayment,
  getProjectById,
  getProjectPaymentById,
  updateProjectPayment,
} from '../../db/projectRepo';
import { dateToIsoDate, isoDateToDate } from '../../utils/dateUtils';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import type { ProjectsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'AddProjectPayment'>;

export default function AddProjectPaymentScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const { projectId, paymentId } = route.params;
  const isEditing = !!paymentId;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [projectSettled, setProjectSettled] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    (async () => {
      const project = await getProjectById(projectId);
      setProjectSettled(project?.status === 'completed');
      setProjectName(project?.name ?? '');

      if (paymentId) {
        const existing = await getProjectPaymentById(paymentId);
        if (existing) {
          setAmount(String(existing.amount));
          setNote(existing.note);
          setDate(isoDateToDate(existing.date));
        }
      }
      setLoading(false);
    })();
  }, [projectId, paymentId]);

  const amountValue = parseFloat(amount);
  const canSave = !isNaN(amountValue) && amountValue > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isEditing && paymentId) {
        await updateProjectPayment(paymentId, {
          amount: amountValue,
          note,
          date: dateToIsoDate(date),
        });
      } else if (projectSettled) {
        await addPostSettlementPayment({
          projectId,
          projectName,
          amount: amountValue,
          note,
          date: dateToIsoDate(date),
        });
      } else {
        await addProjectPayment({
          projectId,
          amount: amountValue,
          note,
          date: dateToIsoDate(date),
        });
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!paymentId) return;
    await deleteProjectPayment(paymentId);
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
        {isEditing ? t('editPayment') : t('addPaymentReceived')}
      </Text>

      {!isEditing && projectSettled ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('postSettlementPaymentNote')}
        </Text>
      ) : null}

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
      <DateField label={t('dateWord')} value={date} onChange={setDate} maximumDate={new Date()} />

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!canSave || saving}
        loading={saving}
        style={{ borderRadius: 14, marginTop: 8 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {isEditing ? t('save') : t('addPayment')}
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
