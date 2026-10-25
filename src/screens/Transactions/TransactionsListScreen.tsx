import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, Portal, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { TransactionRow } from '../../components/TransactionRow';
import { EmptyState } from '../../components/EmptyState';
import { DateField } from '../../components/DateField';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation, translateAccount } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import {
  currentMonthRange,
  dateToIsoDate,
  isoDateToDate,
  lastNMonthsRanges,
} from '../../utils/dateUtils';
import { deletePersonalTransactions, getFilteredTransactions } from '../../db/personalRepo';
import type { HomeStackParamList } from '../../navigation/types';
import type { PersonalTransaction, TransactionType } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'TransactionsList'>;

type TypeFilter = 'all' | TransactionType;
type RangeMode = 'all' | 'thisMonth' | 'lastMonth' | 'custom';

export default function TransactionsListScreen({ route }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t, lang } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const account = route.params?.account;
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(route.params?.type ?? 'all');
  const [rangeMode, setRangeMode] = useState<RangeMode>(route.params?.rangeMode ?? 'all');
  const [customStart, setCustomStart] = useState(new Date());
  const [customEnd, setCustomEnd] = useState(new Date());

  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const range = useMemo((): { start?: string; end?: string } => {
    if (rangeMode === 'all') return {};
    if (rangeMode === 'thisMonth') return currentMonthRange();
    if (rangeMode === 'lastMonth') {
      const [prev] = lastNMonthsRanges(2);
      return { start: prev.start, end: prev.end };
    }
    return { start: dateToIsoDate(customStart), end: dateToIsoDate(customEnd) };
  }, [rangeMode, customStart, customEnd]);

  const load = useCallback(async () => {
    const data = await getFilteredTransactions({
      type: typeFilter === 'all' ? undefined : typeFilter,
      account,
      startDate: range.start,
      endDate: range.end,
    });
    setTransactions(data);
  }, [typeFilter, account, range.start, range.end]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const total = transactions.reduce(
    (sum, tItem) => sum + (tItem.type === 'income' ? tItem.amount : -tItem.amount),
    0
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    await deletePersonalTransactions(Array.from(selectedIds));
    setDeleteDialogVisible(false);
    exitSelectionMode();
    load();
  };

  if (!settings) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenContainer>
        <View style={styles.headerRow}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            {account ? translateAccount(account, lang) : t('allTransactions')}
          </Text>
          {selectionMode ? (
            <Text variant="labelMedium" style={{ color: theme.colors.primary }} onPress={exitSelectionMode}>
              {t('cancel')}
            </Text>
          ) : (
            <IconButton icon="checkbox-multiple-marked-outline" size={20} onPress={() => setSelectionMode(true)} />
          )}
        </View>

        <SegmentedButtons
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
          buttons={[
            { value: 'all', label: t('all') },
            { value: 'income', label: t('income') },
            { value: 'expense', label: t('cost') },
          ]}
        />

        <SegmentedButtons
          value={rangeMode}
          onValueChange={(v) => setRangeMode(v as RangeMode)}
          buttons={[
            { value: 'all', label: t('allTime') },
            { value: 'thisMonth', label: t('thisMonth') },
            { value: 'lastMonth', label: t('lastMonth') },
            { value: 'custom', label: t('customRange') },
          ]}
        />

        {rangeMode === 'custom' ? (
          <View style={styles.rangeRow}>
            <View style={{ flex: 1 }}>
              <DateField
                label={t('from')}
                value={customStart}
                onChange={setCustomStart}
                maximumDate={customEnd}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateField label={t('to')} value={customEnd} onChange={setCustomEnd} maximumDate={new Date()} />
            </View>
          </View>
        ) : null}

        <View
          style={[styles.totalCard, { backgroundColor: theme.colors.surfaceVariant }]}
        >
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {transactions.length} {t('entriesWord')}
          </Text>
          <Text
            variant="titleMedium"
            style={{ color: total >= 0 ? colors.income : colors.expense, fontWeight: '700' }}
          >
            {formatCurrency(total, settings.currencySymbol)}
          </Text>
        </View>

        {transactions.length === 0 ? (
          <EmptyState icon="wallet-outline" title={t('noTransactionsFound')} />
        ) : (
          <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                currencySymbol={settings.currencySymbol}
                lang={lang}
                selectionMode={selectionMode}
                selected={selectedIds.has(tx.id)}
                onPress={selectionMode ? () => toggleSelect(tx.id) : undefined}
              />
            ))}
          </View>
        )}
      </ScreenContainer>

      {selectionMode && selectedIds.size > 0 ? (
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Text style={{ color: theme.colors.onSurface }}>
            {selectedIds.size} {t('selected')}
          </Text>
          <Button
            mode="contained"
            icon="trash-can-outline"
            buttonColor={colors.expense}
            onPress={() => setDeleteDialogVisible(true)}
          >
            {t('deleteSelected')}
          </Button>
        </View>
      ) : null}

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>{t('deleteSelected')}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{t('deleteSelectedConfirm')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>{t('cancel')}</Button>
            <Button onPress={handleBulkDelete} textColor={colors.expense}>
              {t('delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangeRow: { flexDirection: 'row', gap: 12 },
  totalCard: { borderRadius: 14, padding: 12, gap: 4 },
  listCard: { borderRadius: 18, borderWidth: 1, padding: 12 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
});
