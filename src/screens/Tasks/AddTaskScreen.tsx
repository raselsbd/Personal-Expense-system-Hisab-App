import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, Dialog, Menu, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { addTask, deleteTask, getTaskById, setTaskNotificationId, updateTask } from '../../db/taskRepo';
import { cancelScheduledNotification, scheduleTaskReminder } from '../../utils/notifications';
import { formatDisplayDateTime } from '../../utils/dateUtils';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import type { TasksStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TasksStackParamList, 'AddTask'>;

export default function AddTaskScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;
  const REMINDER_OPTIONS = [
    { label: t('min30Before'), value: 30 },
    { label: t('hour1Before'), value: 60 },
    { label: t('hour3Before'), value: 180 },
    { label: t('day1Before'), value: 1440 },
  ];

  const taskId = route.params?.taskId;
  const isEditing = !!taskId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [menuVisible, setMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [existingNotificationId, setExistingNotificationId] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    (async () => {
      const existing = await getTaskById(taskId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description);
        setDeadline(new Date(existing.deadline));
        setReminderMinutes(existing.reminderMinutesBefore);
        setExistingNotificationId(existing.notificationId);
      }
      setLoading(false);
    })();
  }, [taskId]);

  const canSave = title.trim().length > 0;

  const openAndroidTimePicker = (baseDate: Date) => {
    DateTimePickerAndroid.open({
      value: deadline,
      mode: 'time',
      is24Hour: false,
      onChange: (event, selectedTime) => {
        if (event.type !== 'set' || !selectedTime) return;
        const combined = new Date(baseDate);
        combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
        setDeadline(combined);
      },
    });
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: deadline,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event, selectedDate) => {
          if (event.type !== 'set' || !selectedDate) return;
          openAndroidTimePicker(selectedDate);
        },
      });
    } else {
      setShowPicker(true);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isEditing && taskId) {
        if (existingNotificationId) {
          await cancelScheduledNotification(existingNotificationId);
        }
        const notificationId = await scheduleTaskReminder(
          taskId,
          title.trim(),
          deadline.toISOString(),
          reminderMinutes
        );
        await updateTask(taskId, {
          title: title.trim(),
          description: description.trim(),
          deadline: deadline.toISOString(),
          reminderMinutesBefore: reminderMinutes,
          notificationId,
        });
      } else {
        const task = await addTask({
          title: title.trim(),
          description: description.trim(),
          deadline: deadline.toISOString(),
          reminderMinutesBefore: reminderMinutes,
        });
        const notificationId = await scheduleTaskReminder(
          task.id,
          task.title,
          task.deadline,
          reminderMinutes
        );
        if (notificationId) {
          await setTaskNotificationId(task.id, notificationId);
        }
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    if (existingNotificationId) {
      await cancelScheduledNotification(existingNotificationId);
    }
    await deleteTask(taskId);
    setDeleteDialogVisible(false);
    navigation.goBack();
  };

  const reminderLabel = REMINDER_OPTIONS.find((o) => o.value === reminderMinutes)?.label ?? t('hour1Before');

  if (loading) {
    return (
      <ScreenContainer>
        <View />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {isEditing ? t('editTask') : t('newTask')}
      </Text>

      <TextInput label={t('taskTitle')} value={title} onChangeText={setTitle} mode="outlined" />
      <TextInput
        label={t('noteOptional')}
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
      />

      <View>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          {t('deadline')}
        </Text>
        <Button mode="outlined" icon="calendar-clock" onPress={openPicker} style={{ borderRadius: 12 }}>
          {formatDisplayDateTime(deadline.toISOString())}
        </Button>
        {Platform.OS === 'ios' && showPicker ? (
          <>
            <DateTimePicker
              value={deadline}
              mode="datetime"
              display="spinner"
              onChange={(event, selected) => {
                if (event.type === 'set' && selected) setDeadline(selected);
              }}
              minimumDate={new Date()}
            />
            <Button mode="text" onPress={() => setShowPicker(false)}>
              {t('confirm')}
            </Button>
          </>
        ) : null}
      </View>

      <View>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          {t('remindMe')}
        </Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button mode="outlined" icon="bell-outline" onPress={() => setMenuVisible(true)} style={{ borderRadius: 12 }}>
              {reminderLabel}
            </Button>
          }
        >
          {REMINDER_OPTIONS.map((o) => (
            <Menu.Item
              key={o.value}
              title={o.label}
              onPress={() => {
                setReminderMinutes(o.value);
                setMenuVisible(false);
              }}
            />
          ))}
        </Menu>
      </View>

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!canSave || saving}
        loading={saving}
        style={{ borderRadius: 14, marginTop: 8 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {isEditing ? t('save') : t('saveTask')}
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
