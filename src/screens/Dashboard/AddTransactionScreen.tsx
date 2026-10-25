import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, Portal, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { DateField } from '../../components/DateField';
import { ReceiptPicker } from '../../components/ReceiptPicker';
import { AccountPicker } from '../../components/AccountPicker';
import {
  addPersonalTransaction,
  deletePersonalTransaction,
  getPersonalTransactionById,
  updatePersonalTransaction,
} from '../../db/personalRepo';
import { listCustomCategories } from '../../db/customCategoryRepo';
import { todayIso, isoDateToDate, dateToIsoDate } from '../../utils/dateUtils';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation, translateCategory } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import type { HomeStackParamList } from '../../navigation/types';
import type { AccountType, CustomCategory, TransactionType } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'AddTransaction'>;

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Other'];

export default function AddTransactionScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t, lang } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const transactionId = route.params?.transactionId;
  const isEditing = !!transactionId;

  const [type, setType] = useState<TransactionType>(route.params?.type ?? 'expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountType>('cash');

  useEffect(() => {
    listCustomCategories().then(setCustomCategories);
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        title: isEditing ? (type === 'income' ? t('editIncome') : t('editCost')) : type === 'income' ? t('addIncome') : t('addCost'),
      });
    }, [navigation, isEditing, type, t])
  );

  useEffect(() => {
    if (!transactionId) return;
    (async () => {
      const existing = await getPersonalTransactionById(transactionId);
      if (existing) {
        setType(existing.type);
        setAmount(String(existing.amount));
        setCategory(existing.category);
        setNote(existing.note);
        setDate(existing.date);
        setPhotoUri(existing.photoUri);
        setAccount(existing.account);
      }
      setLoading(false);
    })();
  }, [transactionId]);

  const categories = [
    ...(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES),
    ...customCategories.filter((c) => c.type === type).map((c) => c.name),
  ];
  const amountValue = parseFloat(amount);
  const canSave = !isNaN(amountValue) && amountValue > 0 && category.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (isEditing && transactionId) {
        await updatePersonalTransaction(transactionId, {
          type,
          amount: amountValue,
          category,
          note,
          date,
          account,
          photoUri,
        });
      } else {
        await addPersonalTransaction({
          type,
          amount: amountValue,
          category,
          note,
          date,
          account,
          photoUri,
        });
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!transactionId) return;
    await deletePersonalTransaction(transactionId);
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
        {isEditing ? (type === 'income' ? t('editIncome') : t('editCost')) : type === 'income' ? t('addIncome') : t('addCost')}
      </Text>

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
      />

      <View>
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

      <AccountPicker label={t('accountLabel')} value={account} onChange={setAccount} lang={lang} />

      <TextInput label={t('noteOptional')} value={note} onChangeText={setNote} mode="outlined" />

      {type === 'expense' ? <ReceiptPicker value={photoUri} onChange={setPhotoUri} /> : null}

      <DateField
        label={t('dateWord')}
        value={isoDateToDate(date)}
        onChange={(d) => setDate(dateToIsoDate(d))}
        maximumDate={new Date()}
      />

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!canSave || saving}
        loading={saving}
        style={{ borderRadius: 14, marginTop: 8 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {isEditing
          ? type === 'income'
            ? t('updateIncomeBtn')
            : t('updateCostBtn')
          : type === 'income'
            ? t('saveIncomeBtn')
            : t('saveCostBtn')}
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

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
