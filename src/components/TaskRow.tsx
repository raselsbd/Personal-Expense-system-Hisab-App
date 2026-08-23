import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { semantic } from '../theme/colors';
import { formatDisplayDateTime } from '../utils/dateUtils';
import type { TaskItem } from '../types';

interface Props {
  task: TaskItem;
  onToggle: () => void;
  onPress?: () => void;
}

function isOverdue(task: TaskItem): boolean {
  return !task.completed && new Date(task.deadline).getTime() < Date.now();
}

export function TaskRow({ task, onToggle, onPress }: Props) {
  const theme = useTheme();
  const colors = theme.dark ? semantic.dark : semantic.light;
  const overdue = isOverdue(task);

  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <Checkbox
        status={task.completed ? 'checked' : 'unchecked'}
        onPress={onToggle}
        color={colors.income}
      />
      <View style={styles.middle}>
        <Text
          variant="bodyLarge"
          style={{
            color: task.completed ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
            textDecorationLine: task.completed ? 'line-through' : 'none',
          }}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={13}
            color={overdue ? colors.critical : theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodySmall"
            style={{ color: overdue ? colors.critical : theme.colors.onSurfaceVariant }}
          >
            {formatDisplayDateTime(task.deadline)}
            {overdue ? ' · Overdue' : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  middle: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
