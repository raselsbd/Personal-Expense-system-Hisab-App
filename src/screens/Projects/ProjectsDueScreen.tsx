import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import { getAllProjectsWithStats } from '../../db/projectRepo';
import type { ProjectsStackParamList } from '../../navigation/types';
import type { ProjectWithStats } from '../../types';

type Props = NativeStackScreenProps<ProjectsStackParamList, 'ProjectsDue'>;

export default function ProjectsDueScreen({ navigation }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const [dueProjects, setDueProjects] = useState<ProjectWithStats[]>([]);

  const load = useCallback(async () => {
    const projects = await getAllProjectsWithStats();
    const withDue = projects.filter((p) => p.effectiveDue > 0).sort((a, b) => b.effectiveDue - a.effectiveDue);
    setDueProjects(withDue);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!settings) return null;

  const totalDue = dueProjects.reduce((sum, p) => sum + p.effectiveDue, 0);

  return (
    <ScreenContainer>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {t('dueCardTitle')}
      </Text>

      <View style={[styles.totalCard, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('totalOutstanding')}
        </Text>
        <Text variant="titleMedium" style={{ color: colors.major, fontWeight: '700' }}>
          {formatCurrency(totalDue, settings.currencySymbol)}
        </Text>
      </View>

      {dueProjects.length === 0 ? (
        <EmptyState icon="check-circle-outline" title={t('noProjectDueYet')} />
      ) : (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          {dueProjects.map((p) => (
            <Pressable
              key={p.id}
              style={styles.row}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                  {p.name}
                </Text>
                {p.client ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                    {p.client}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: colors.major, fontWeight: '700' }}>
                {formatCurrency(p.effectiveDue, settings.currencySymbol)}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  totalCard: { borderRadius: 14, padding: 12, gap: 4 },
  card: { borderRadius: 18, borderWidth: 1, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 6 },
});
