import * as SecureStore from 'expo-secure-store';
import { getDb } from './database';
import type { AppSettings } from '../types';

const DEFAULTS: AppSettings = {
  profileName: '',
  currencySymbol: '৳',
  monthlyThreshold: 10000,
  majorThresholdPct: 70,
  criticalThresholdPct: 100,
  appLockEnabled: false,
  appLockPinHash: null,
  biometricEnabled: false,
  themeMode: 'system',
  language: 'en',
};

const PIN_KEY = 'hisab_app_lock_pin_hash';

export async function getValue(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    key
  );
  return row?.value ?? null;
}

export async function setValue(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

export async function getSettings(): Promise<AppSettings> {
  const [
    profileName,
    currencySymbol,
    monthlyThreshold,
    majorThresholdPct,
    criticalThresholdPct,
    appLockEnabled,
    biometricEnabled,
    themeMode,
    language,
    pinHash,
  ] = await Promise.all([
    getValue('profileName'),
    getValue('currencySymbol'),
    getValue('monthlyThreshold'),
    getValue('majorThresholdPct'),
    getValue('criticalThresholdPct'),
    getValue('appLockEnabled'),
    getValue('biometricEnabled'),
    getValue('themeMode'),
    getValue('language'),
    SecureStore.getItemAsync(PIN_KEY),
  ]);

  return {
    profileName: profileName ?? DEFAULTS.profileName,
    currencySymbol: currencySymbol ?? DEFAULTS.currencySymbol,
    monthlyThreshold: monthlyThreshold ? Number(monthlyThreshold) : DEFAULTS.monthlyThreshold,
    majorThresholdPct: majorThresholdPct ? Number(majorThresholdPct) : DEFAULTS.majorThresholdPct,
    criticalThresholdPct: criticalThresholdPct
      ? Number(criticalThresholdPct)
      : DEFAULTS.criticalThresholdPct,
    appLockEnabled: appLockEnabled === '1',
    appLockPinHash: pinHash,
    biometricEnabled: biometricEnabled === '1',
    themeMode: (themeMode as AppSettings['themeMode']) ?? DEFAULTS.themeMode,
    language: (language as AppSettings['language']) ?? DEFAULTS.language,
  };
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<void> {
  const ops: Promise<void>[] = [];
  if (partial.profileName !== undefined) ops.push(setValue('profileName', partial.profileName));
  if (partial.currencySymbol !== undefined) ops.push(setValue('currencySymbol', partial.currencySymbol));
  if (partial.monthlyThreshold !== undefined)
    ops.push(setValue('monthlyThreshold', String(partial.monthlyThreshold)));
  if (partial.majorThresholdPct !== undefined)
    ops.push(setValue('majorThresholdPct', String(partial.majorThresholdPct)));
  if (partial.criticalThresholdPct !== undefined)
    ops.push(setValue('criticalThresholdPct', String(partial.criticalThresholdPct)));
  if (partial.appLockEnabled !== undefined)
    ops.push(setValue('appLockEnabled', partial.appLockEnabled ? '1' : '0'));
  if (partial.biometricEnabled !== undefined)
    ops.push(setValue('biometricEnabled', partial.biometricEnabled ? '1' : '0'));
  if (partial.themeMode !== undefined) ops.push(setValue('themeMode', partial.themeMode));
  if (partial.language !== undefined) ops.push(setValue('language', partial.language));
  if (partial.appLockPinHash !== undefined) {
    ops.push(
      partial.appLockPinHash
        ? SecureStore.setItemAsync(PIN_KEY, partial.appLockPinHash)
        : SecureStore.deleteItemAsync(PIN_KEY)
    );
  }
  await Promise.all(ops);
}
