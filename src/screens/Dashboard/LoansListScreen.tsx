import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, FAB, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/dateUtils';
import { listLoans, setLoanSettled } from '../../db/loanRepo';
import type { HomeStackParamList } from '../../navigation/types';
import type { LoanDirection, PersonalLoan } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'LoansList'>;

export default function LoansListScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const [direction, setDirection] = useState<LoanDirection>(route.params?.direction ?? 'lent');
  const [loans, setLoans] = useState<PersonalLoan[]>([]);

  const load = useCallback(async () => {
    const data = await listLoans(direction);
    setLoans(data);
  }, [direction]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggleSettled = async (loan: PersonalLoan) => {
    await setLoanSettled(loan.id, !loan.settled);
    load();
  };

  const outstandingTotal = loans
    .filter((l) => !l.settled)
    .reduce((sum, l) => sum + l.amount, 0);

  if (!settings) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenContainer>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {direction === 'lent' ? t('dueCardTitle') : t('payableCardTitle')}
        </Text>

        <SegmentedButtons
          value={direction}
          onValueChange={(v) => setDirection(v as LoanDirection)}
          buttons={[
            { value: 'lent', label: t('lentTab') },
            { value: 'borrowed', label: t('borrowedTab') },
          ]}
        />

        <View style={[styles.totalCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('totalOutstanding')}
          </Text>
          <Text
            variant="titleMedium"
            style={{ color: direction === 'lent' ? colors.income : colors.expense, fontWeight: '700' }}
          >
            {formatCurrency(outstandingTotal, settings.currencySymbol)}
          </Text>
        </View>

        {loans.length === 0 ? (
          <EmptyState
            icon="hand-coin-outline"
            title={direction === 'lent' ? t('noLentYet') : t('noBorrowedYet')}
          />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            {loans.map((loan) => (
              <Pressable
                key={loan.id}
                style={styles.row}
                onPress={() => navigation.navigate('AddLoan', { loanId: loan.id })}
              >
                <Checkbox
                  status={loan.settled ? 'checked' : 'unchecked'}
                  onPress={() => handleToggleSettled(loan)}
                  color={colors.income}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.onSurface,
                      textDecorationLine: loan.settled ? 'line-through' : 'none',
                    }}
                  >
                    {loan.personName}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDisplayDate(loan.date)}
                    {loan.dueDate && !loan.settled ? ` · ${t('dueOn')} ${formatDisplayDate(loan.dueDate)}` : ''}
                  </Text>
                </View>
                <Text
                  style={{
                    color: direction === 'lent' ? colors.income : colors.expense,
                    fontWeight: '700',
                    opacity: loan.settled ? 0.5 : 1,
                  }}
                >
                  {formatCurrency(loan.amount, settings.currencySymbol)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScreenContainer>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 24 }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('AddLoan', { direction })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  totalCard: { borderRadius: 14, padding: 12, gap: 4 },
  card: { borderRadius: 18, borderWidth: 1, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 4 },
  fab: { position: 'absolute', right: 16, borderRadius: 16 },
});
