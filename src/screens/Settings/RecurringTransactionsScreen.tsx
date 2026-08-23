import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, IconButton, SegmentedButtons, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation, translateCategory } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import {
  addRecurringTransaction,
  deleteRecurringTransaction,
  listRecurringTransactions,
  setRecurringActive,
} from '../../db/recurringRepo';
import { listCustomCategories } from '../../db/customCategoryRepo';
import type { SettingsStackParamList } from '../../navigation/types';
import type { CustomCategory, RecurringTransaction, TransactionType } from '../../types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'RecurringTransactions'>;

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Other'];

export default function RecurringTransactionsScreen({}: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t, lang } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  const load = useCallback(async () => {
    const [recurring, custom] = await Promise.all([listRecurringTransactions(), listCustomCategories()]);
    setItems(recurring);
    setCustomCategories(custom);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  if (!settings) return null;

  const categories = [
    ...(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES),
    ...customCategories.filter((c) => c.type === type).map((c) => c.name),
  ];

  const amountValue = parseFloat(amount);
  const dayValue = parseInt(dayOfMonth, 10);
  const canSave =
    !isNaN(amountValue) && amountValue > 0 && category.length > 0 && dayValue >= 1 && dayValue <= 31;

  const handleAdd = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await addRecurringTransaction({
        type,
        amount: amountValue,
        category,
        note: note.trim(),
        dayOfMonth: dayValue,
      });
      setAmount('');
      setCategory('');
      setNote('');
      setDayOfMonth('1');
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: RecurringTransaction) => {
    await setRecurringActive(item.id, !item.active);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteRecurringTransaction(id);
    load();
  };

  return (
    <ScreenContainer>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {t('recurringTransactions')}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {t('recurringTransactionsDesc')}
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <SegmentedButtons
          value={type}
          onValueChange={(v) => {
            setType(v as TransactionType);
            setCategory('');
          }}
          buttons={[
            { value: 'income', label: t('income'), icon: 'cash-plus' },
            { value: 'expense', label: t('cost'), icon: 'cash-minus' },
          ]}
        />

        <TextInput
          label={t('amount')}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          mode="outlined"
          left={<TextInput.Affix text={settings.currencySymbol} />}
          style={{ marginTop: 12 }}
        />

        <View style={{ marginTop: 12 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            {t('category')}
          </Text>
          <View style={styles.chipsRow}>
            {categories.map((c) => (
              <Chip
                key={c}
                selected={c === category}
                onPress={() => setCategory(c)}
                mode={c === category ? 'flat' : 'outlined'}
                selectedColor={type === 'income' ? colors.income : colors.expense}
                style={
                  c === category
                    ? { backgroundColor: type === 'income' ? colors.incomeContainer : colors.expenseContainer }
                    : undefined
                }
              >
                {translateCategory(c, lang)}
              </Chip>
            ))}
          </View>
        </View>

        <TextInput
          label={t('dayOfMonthLabel')}
          value={dayOfMonth}
          onChangeText={setDayOfMonth}
          keyboardType="number-pad"
          mode="outlined"
          style={{ marginTop: 12 }}
        />
        <TextInput
          label={t('noteOptional')}
          value={note}
          onChangeText={setNote}
          mode="outlined"
          style={{ marginTop: 12 }}
        />

        <Button
          mode="contained"
          icon="plus"
          onPress={handleAdd}
          disabled={!canSave || saving}
          loading={saving}
          style={{ borderRadius: 14, marginTop: 12, alignSelf: 'flex-start' }}
        >
          {t('addRecurring')}
        </Button>
      </View>

      {items.length === 0 ? (
        <EmptyState icon="repeat" title={t('noRecurringYet')} />
      ) : (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          {items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.onSurface }}>
                  {translateCategory(item.category, lang)} · {t('dayOfMonthShort')} {item.dayOfMonth}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: item.type === 'income' ? colors.income : colors.expense, fontWeight: '700' }}
                >
                  {item.type === 'income' ? '+' : '-'}
                  {formatCurrency(item.amount, settings.currencySymbol)}
                </Text>
              </View>
              <Switch value={item.active} onValueChange={() => handleToggleActive(item)} />
              <IconButton icon="trash-can-outline" size={18} onPress={() => handleDelete(item.id)} />
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 4 },
});
