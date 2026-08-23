import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { semantic } from '../theme/colors';
import { formatCurrency } from '../utils/currency';
import { formatDisplayDate } from '../utils/dateUtils';
import { translateCategory } from '../i18n/useTranslation';
import type { Language, PersonalTransaction } from '../types';

interface Props {
  transaction: PersonalTransaction;
  currencySymbol: string;
  lang?: Language;
  onPress?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  Salary: 'cash',
  'Project Settlement': 'briefcase-check',
  'Loan Given': 'hand-coin-outline',
  'Loan Returned': 'cash-refund',
  Food: 'food',
  Transport: 'bus',
  Bills: 'file-document',
  Shopping: 'cart',
  Health: 'heart-pulse',
  Other: 'shape',
};

export function TransactionRow({
  transaction,
  currencySymbol,
  lang = 'en',
  onPress,
  selectionMode = false,
  selected = false,
}: Props) {
  const theme = useTheme();
  const colors = theme.dark ? semantic.dark : semantic.light;
  const isIncome = transaction.type === 'income';
  const color = isIncome ? colors.income : colors.expense;
  const bg = isIncome ? colors.incomeContainer : colors.expenseContainer;
  const icon = CATEGORY_ICONS[transaction.category] ?? 'shape';

  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      {selectionMode ? (
        <Checkbox status={selected ? 'checked' : 'unchecked'} onPress={onPress} />
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={icon as any} size={18} color={color} />
          {transaction.source === 'recurring' ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons name="repeat" size={10} color={theme.colors.onSurfaceVariant} />
            </View>
          ) : null}
        </View>
      )}
      <View style={styles.middle}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
          {translateCategory(transaction.category, lang)}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
          {transaction.note ? transaction.note : formatDisplayDate(transaction.date)}
        </Text>
      </View>
      {transaction.photoUri ? (
        <MaterialCommunityIcons name="paperclip" size={16} color={theme.colors.onSurfaceVariant} />
      ) : null}
      <Text variant="bodyLarge" style={{ color, fontWeight: '700' }}>
        {isIncome ? '+' : '-'}
        {formatCurrency(Math.abs(transaction.amount), currencySymbol)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 2 },
});
