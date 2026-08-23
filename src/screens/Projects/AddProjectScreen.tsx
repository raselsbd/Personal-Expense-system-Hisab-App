import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { DateField } from '../../components/DateField';
import {
  addProject,
  getProjectById,
  setProjectPaymentReminderNotificationId,
  updateProject,
} from '../../db/projectRepo';
import { schedulePaymentDueReminder } from '../../utils/notifications';
import { dateToIsoDate, isoDateToDate } from '../../utils/dateUtils';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProjectsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'AddProject'>;

export default function AddProjectScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t } = useTranslation();

  const projectId = route.params?.projectId;
  const isEditing = !!projectId;

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  const [hasHistory, setHasHistory] = useState(false);
  const [openingSpent, setOpeningSpent] = useState('');
  const [openingReceived, setOpeningReceived] = useState('');

  const [hasDueDate, setHasDueDate] = useState(false);
  const [paymentDueDate, setPaymentDueDate] = useState(new Date());

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const existing = await getProjectById(projectId);
      if (existing) {
        setName(existing.name);
        setClient(existing.client);
        setBudget(String(existing.budget));
        setDescription(existing.description);
        setStartDate(isoDateToDate(existing.startDate));
      }
      setLoading(false);
    })();
  }, [projectId]);

  const budgetValue = parseFloat(budget);
  const canSave = name.trim().length > 0 && !isNaN(budgetValue) && budgetValue > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isEditing && projectId) {
        await updateProject(projectId, {
          name: name.trim(),
          client: client.trim(),
          budget: budgetValue,
          description: description.trim(),
          startDate: dateToIsoDate(startDate),
        });
        navigation.goBack();
        return;
      }

      const dueDateIso = hasDueDate ? dateToIsoDate(paymentDueDate) : null;
      const project = await addProject({
        name: name.trim(),
        client: client.trim(),
        budget: budgetValue,
        description: description.trim(),
        startDate: dateToIsoDate(startDate),
        paymentDueDate: dueDateIso,
        openingSpent: hasHistory ? parseFloat(openingSpent) || 0 : 0,
        openingReceived: hasHistory ? parseFloat(openingReceived) || 0 : 0,
      });
      if (dueDateIso) {
        const notificationId = await schedulePaymentDueReminder(project.id, project.name, dueDateIso);
        if (notificationId) {
          await setProjectPaymentReminderNotificationId(project.id, notificationId);
        }
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
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
        {isEditing ? t('editProject') : t('newProject')}
      </Text>

      <TextInput label={t('projectName')} value={name} onChangeText={setName} mode="outlined" />
      <TextInput label={t('clientOptional')} value={client} onChangeText={setClient} mode="outlined" />
      <TextInput
        label={t('totalBudget')}
        value={budget}
        onChangeText={setBudget}
        keyboardType="decimal-pad"
        mode="outlined"
        left={<TextInput.Affix text={settings.currencySymbol} />}
      />
      <TextInput
        label={t('descriptionOptional')}
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
      />

      <DateField label={t('startDate')} value={startDate} onChange={setStartDate} maximumDate={new Date()} />

      {!isEditing ? (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.onSurface }}>{t('historicalToggleLabel')}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('historicalToggleDesc')}
              </Text>
            </View>
            <Switch value={hasHistory} onValueChange={setHasHistory} />
          </View>
          {hasHistory ? (
            <View style={{ gap: 12, marginTop: 12 }}>
              <TextInput
                label={t('openingSpent')}
                value={openingSpent}
                onChangeText={setOpeningSpent}
                keyboardType="decimal-pad"
                mode="outlined"
                left={<TextInput.Affix text={settings.currencySymbol} />}
              />
              <TextInput
                label={t('openingReceived')}
                value={openingReceived}
                onChangeText={setOpeningReceived}
                keyboardType="decimal-pad"
                mode="outlined"
                left={<TextInput.Affix text={settings.currencySymbol} />}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {!isEditing ? (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.onSurface }}>{t('paymentDueToggleLabel')}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('paymentDueToggleDesc')}
              </Text>
            </View>
            <Switch value={hasDueDate} onValueChange={setHasDueDate} />
          </View>
          {hasDueDate ? (
            <View style={{ marginTop: 12 }}>
              <DateField label={t('paymentDueDateLabel')} value={paymentDueDate} onChange={setPaymentDueDate} />
            </View>
          ) : null}
        </View>
      ) : (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('editProjectDueDateNote')}
        </Text>
      )}

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!canSave || saving}
        loading={saving}
        style={{ borderRadius: 14, marginTop: 8 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {isEditing ? t('save') : t('createProject')}
      </Button>
    </ScreenContainer>
  );
}

const styles = {
  card: { borderRadius: 18, borderWidth: 1, padding: 14 } as const,
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 } as const,
};
