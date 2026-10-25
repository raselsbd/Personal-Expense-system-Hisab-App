import React from 'react';
import { View } from 'react-native';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { translateAccount } from '../i18n/useTranslation';
import { ACCOUNT_TYPES } from '../types';
import type { AccountType, Language } from '../types';

export const ACCOUNT_ICONS: Record<AccountType, string> = {
  cash: 'cash',
  bkash: 'cellphone',
  bank: 'bank',
};

interface Props {
  label: string;
  value: AccountType;
  onChange: (account: AccountType) => void;
  lang: Language;
}

export function AccountPicker({ label, value, onChange, lang }: Props) {
  const theme = useTheme();
  return (
    <View>
      <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
        {label}
      </Text>
      <SegmentedButtons
        value={value}
        onValueChange={(v) => onChange(v as AccountType)}
        buttons={ACCOUNT_TYPES.map((a) => ({ value: a, label: translateAccount(a, lang), icon: ACCOUNT_ICONS[a] }))}
      />
    </View>
  );
}
