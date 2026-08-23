import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, IconButton, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { TaskRow } from '../../components/TaskRow';
import { EmptyState } from '../../components/EmptyState';
import { getAllTasks, deleteTask, setTaskCompleted } from '../../db/taskRepo';
import { cancelScheduledNotification } from '../../utils/notifications';
import { useTranslation } from '../../i18n/useTranslation';
import type { TasksStackParamList } from '../../navigation/types';
import type { TaskItem } from '../../types';

type Props = NativeStackScreenProps<TasksStackParamList, 'TasksList'>;

type Filter = 'pending' | 'completed';

export default function TasksListScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const data = await getAllTasks();
    setTasks(data);
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

  const handleToggle = async (task: TaskItem) => {
    await setTaskCompleted(task.id, !task.completed);
    if (!task.completed && task.notificationId) {
      await cancelScheduledNotification(task.notificationId);
    }
    load();
  };

  const handleDelete = async (task: TaskItem) => {
    if (task.notificationId) {
      await cancelScheduledNotification(task.notificationId);
    }
    await deleteTask(task.id);
    load();
  };

  const filtered = tasks.filter((task) => (filter === 'pending' ? !task.completed : task.completed));

  return (
    <View style={{ flex: 1 }}>
      <ScreenContainer onRefresh={onRefresh} refreshing={loading}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {t('tasksTitle')}
        </Text>

        <SegmentedButtons
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          buttons={[
            { value: 'pending', label: t('pendingWord') },
            { value: 'completed', label: t('completedWord') },
          ]}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon="calendar-check"
            title={filter === 'pending' ? t('noPendingTasks') : t('noCompletedTasks')}
            subtitle={filter === 'pending' ? t('addTaskSubtitle') : undefined}
          />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            {filtered.map((task) => (
              <View key={task.id} style={styles.rowWrap}>
                <View style={{ flex: 1 }}>
                  <TaskRow
                    task={task}
                    onToggle={() => handleToggle(task)}
                    onPress={() => navigation.navigate('AddTask', { taskId: task.id })}
                  />
                </View>
                <IconButton icon="trash-can-outline" size={18} onPress={() => handleDelete(task)} />
              </View>
            ))}
          </View>
        )}
      </ScreenContainer>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 24 }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddTask')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 10 },
  rowWrap: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', right: 16, borderRadius: 16 },
});
