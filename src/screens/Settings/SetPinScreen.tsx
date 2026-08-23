import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { hashPin } from '../../utils/pin';
import type { SettingsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SetPin'>;

const PIN_LENGTH = 4;

export default function SetPinScreen({ navigation }: Props) {
  const theme = useTheme();
  const { updateSettings } = useSettings();
  const { t } = useTranslation();
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const activePin = stage === 'enter' ? pin : confirmPin;
  const setActivePin = stage === 'enter' ? setPin : setConfirmPin;

  const handleDigit = (digit: string) => {
    if (activePin.length >= PIN_LENGTH) return;
    const next = activePin + digit;
    setActivePin(next);
    setError('');

    if (next.length === PIN_LENGTH) {
      if (stage === 'enter') {
        setTimeout(() => setStage('confirm'), 150);
      } else {
        finish(pin, next);
      }
    }
  };

  const handleBackspace = () => {
    setActivePin(activePin.slice(0, -1));
  };

  const finish = async (original: string, confirm: string) => {
    if (original !== confirm) {
      setError(t('pinsDidNotMatch'));
      setPin('');
      setConfirmPin('');
      setStage('enter');
      return;
    }
    setSaving(true);
    try {
      const hash = await hashPin(original);
      await updateSettings({ appLockPinHash: hash, appLockEnabled: true });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.wrap}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {stage === 'enter' ? t('setAPin') : t('confirmPin')}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {stage === 'enter' ? t('choosePinDesc') : t('enterPinAgainDesc')}
        </Text>

        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < activePin.length ? theme.colors.primary : theme.colors.surfaceVariant,
                },
              ]}
            />
          ))}
        </View>

        {error ? (
          <Text style={{ color: theme.colors.error, textAlign: 'center' }}>{error}</Text>
        ) : null}

        <View style={styles.keypad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key, i) =>
            key === '' ? (
              <View key={i} style={styles.key} />
            ) : (
              <Button
                key={i}
                mode="text"
                onPress={() => (key === 'back' ? handleBackspace() : handleDigit(key))}
                disabled={saving}
                style={styles.key}
                labelStyle={{ fontSize: 20 }}
                icon={key === 'back' ? 'backspace-outline' : undefined}
              >
                {key === 'back' ? '' : key}
              </Button>
            )
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 16, paddingTop: 24 },
  dotsRow: { flexDirection: 'row', gap: 14, marginVertical: 20 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'center' },
  key: { width: 80, height: 60, justifyContent: 'center', alignItems: 'center' },
});
