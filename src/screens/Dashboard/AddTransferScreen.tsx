import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { DateField } from '../../components/DateField';
import { AccountPicker } from '../../components/AccountPicker';
import { addAccountTransfer } from '../../db/personalRepo';
import { dateToIsoDate } from '../../utils/dateUtils';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import type { HomeStackParamList } from '../../navigation/types';
import type { AccountType } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'AddTransfer'>;

export default function AddTransferScreen({ navigation }: Props) {
  const theme = useTheme();
  const { settings } = useSettings();
  const { t, lang } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const [from, setFrom] = useState<AccountType>('bank');
  const [to, setTo] = useState<AccountType>('cash');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const amountValue = parseFloat(amount);
  const sameAccount = from === to;
  const canSave = !isNaN(amountValue) && amountValue > 0 && !sameAccount;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await addAccountTransfer({ from, to, amount: amountValue, note, date: dateToIsoDate(date) });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <ScreenContainer>
        <View />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {t('transferMoney')}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {t('transferDesc')}
      </Text>

      <AccountPicker label={t('fromAccount')} value={from} onChange={setFrom} lang={lang} />
      <AccountPicker label={t('toAccount')} value={to} onChange={setTo} lang={lang} />
      {sameAccount ? <Text style={{ color: colors.expense }}>{t('sameAccountError')}</Text> : null}

      <TextInput
        label={t('amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        mode="outlined"
        left={<TextInput.Affix text={settings.currencySymbol} />}
      />
      <TextInput label={t('noteOptional')} value={note} onChangeText={setNote} mode="outlined" />
      <DateField label={t('dateWord')} value={date} onChange={setDate} maximumDate={new Date()} />

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={!canSave || saving}
        loading={saving}
        style={{ borderRadius: 14, marginTop: 8 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {t('saveTransferBtn')}
      </Button>
    </ScreenContainer>
  );
}
