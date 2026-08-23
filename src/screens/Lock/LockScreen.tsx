import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import { verifyPin } from '../../utils/pin';
import { useTranslation } from '../../i18n/useTranslation';
import type { AppSettings } from '../../types';

const PIN_LENGTH = 4;

interface Props {
  settings: AppSettings;
  onUnlock: () => void;
}

export default function LockScreen({ settings, onUnlock }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const tryBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Hisab',
      cancelLabel: 'Use PIN',
    });
    if (result.success) onUnlock();
  };

  useEffect(() => {
    if (settings.biometricEnabled) {
      tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDigit = async (digit: string) => {
    if (pin.length >= PIN_LENGTH || checking) return;
    const next = pin + digit;
    setPin(next);
    setError('');

    if (next.length === PIN_LENGTH) {
      setChecking(true);
      const valid = settings.appLockPinHash ? await verifyPin(next, settings.appLockPinHash) : false;
      setChecking(false);
      if (valid) {
        onUnlock();
      } else {
        setError(t('incorrectPin'));
        setPin('');
      }
    }
  };

  const handleBackspace = () => setPin(pin.slice(0, -1));

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={styles.wrap}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name="lock" size={28} color={theme.colors.primary} />
        </View>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {t('enterPin')}
        </Text>

        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i < pin.length ? theme.colors.primary : theme.colors.surfaceVariant },
              ]}
            />
          ))}
        </View>

        {error ? <Text style={{ color: theme.colors.error }}>{error}</Text> : null}

        <View style={styles.keypad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key, i) =>
            key === '' ? (
              <View key={i} style={styles.key} />
            ) : (
              <Button
                key={i}
                mode="text"
                onPress={() => (key === 'back' ? handleBackspace() : handleDigit(key))}
                style={styles.key}
                labelStyle={{ fontSize: 20 }}
                icon={key === 'back' ? 'backspace-outline' : undefined}
              >
                {key === 'back' ? '' : key}
              </Button>
            )
          )}
        </View>

        {settings.biometricEnabled ? (
          <Button icon="fingerprint" onPress={tryBiometric} mode="text">
            {t('useBiometrics')}
          </Button>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 14, marginVertical: 12 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'center', marginTop: 8 },
  key: { width: 80, height: 60, justifyContent: 'center', alignItems: 'center' },
});
