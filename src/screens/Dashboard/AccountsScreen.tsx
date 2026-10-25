import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/ScreenContainer';
import { ACCOUNT_ICONS } from '../../components/AccountPicker';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation, translateAccount } from '../../i18n/useTranslation';
import { palette } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import { getAccountBalances } from '../../db/personalRepo';
import { ACCOUNT_TYPES } from '../../types';
import type { HomeStackParamList } from '../../navigation/types';
import type { AccountType } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Accounts'>;

export default function AccountsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t, lang } = useTranslation();

  const [balances, setBalances] = useState<Record<AccountType, number>>({ cash: 0, bkash: 0, bank: 0 });

  useFocusEffect(
    useCallback(() => {
      getAccountBalances().then(setBalances);
    }, [])
  );

  if (!settings) return null;

  const total = ACCOUNT_TYPES.reduce((sum, a) => sum + balances[a], 0);

  return (
    <ScreenContainer>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {t('accountsTitle')}
      </Text>

      <Pressable style={styles.totalCardWrap} onPress={() => navigation.navigate('TransactionsList')}>
        <LinearGradient
          colors={theme.dark ? [palette.indigo400, palette.indigo700] : [palette.indigo600, palette.indigo700]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalCard}
        >
          <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, opacity: 0.85 }}>
            {t('currentBalance')}
          </Text>
          <Text variant="displaySmall" style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>
            {formatCurrency(total, settings.currencySymbol)}
          </Text>
        </LinearGradient>
      </Pressable>

      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {t('tapAccountForLog')}
      </Text>

      <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        {ACCOUNT_TYPES.map((account) => (
          <Pressable
            key={account}
            style={styles.row}
            onPress={() => navigation.navigate('TransactionsList', { account })}
          >
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name={ACCOUNT_ICONS[account] as any} size={20} color={theme.colors.primary} />
            </View>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
              {translateAccount(account, lang)}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {formatCurrency(balances[account], settings.currencySymbol)}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        ))}
      </View>

      <Button
        mode="outlined"
        icon="swap-horizontal"
        onPress={() => navigation.navigate('AddTransfer')}
        style={{ borderRadius: 14 }}
      >
        {t('transferMoney')}
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  totalCardWrap: {
    borderRadius: 22,
    shadowColor: palette.indigo700,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  totalCard: { borderRadius: 22, padding: 20, gap: 6 },
  listCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
