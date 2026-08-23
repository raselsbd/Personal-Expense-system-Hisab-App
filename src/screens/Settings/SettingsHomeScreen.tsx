import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, IconButton, List, SegmentedButtons, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { DateField } from '../../components/DateField';
import { EmptyState } from '../../components/EmptyState';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { formatCurrency } from '../../utils/currency';
import { format } from 'date-fns';
import {
  deleteThresholdOverride,
  listThresholdOverrides,
  setThresholdOverride,
} from '../../db/monthlyThresholdRepo';
import {
  addCustomCategory,
  deleteCustomCategory,
  listCustomCategories,
} from '../../db/customCategoryRepo';
import { translateCategory } from '../../i18n/useTranslation';
import type { SettingsStackParamList } from '../../navigation/types';
import type { CustomCategory, CustomCategoryType, MonthlyThresholdOverride } from '../../types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

export default function SettingsHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const [thresholdInput, setThresholdInput] = useState(settings ? String(settings.monthlyThreshold) : '');
  const [nameInput, setNameInput] = useState(settings ? settings.profileName : '');

  const [overrideMonth, setOverrideMonth] = useState(new Date());
  const [overrideAmount, setOverrideAmount] = useState('');
  const [overrides, setOverrides] = useState<MonthlyThresholdOverride[]>([]);

  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<CustomCategoryType>('expense');
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  const loadOverrides = useCallback(async () => {
    const data = await listThresholdOverrides();
    setOverrides(data);
  }, []);

  const loadCustomCategories = useCallback(async () => {
    const data = await listCustomCategories();
    setCustomCategories(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOverrides();
      loadCustomCategories();
    }, [loadOverrides, loadCustomCategories])
  );

  useEffect(() => {
    loadOverrides();
    loadCustomCategories();
  }, [loadOverrides, loadCustomCategories]);

  if (!settings) return null;

  const handleThresholdBlur = () => {
    const value = parseFloat(thresholdInput);
    if (!isNaN(value) && value >= 0) {
      updateSettings({ monthlyThreshold: value });
    } else {
      setThresholdInput(String(settings.monthlyThreshold));
    }
  };

  const handleNameBlur = () => {
    updateSettings({ profileName: nameInput.trim() });
  };

  const handleToggleLock = async (enabled: boolean) => {
    if (enabled && !settings.appLockPinHash) {
      navigation.navigate('SetPin');
      return;
    }
    await updateSettings({ appLockEnabled: enabled });
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (enabled) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return;
    }
    await updateSettings({ biometricEnabled: enabled });
  };

  const handleSaveOverride = async () => {
    const value = parseFloat(overrideAmount);
    if (isNaN(value) || value < 0) return;
    await setThresholdOverride(format(overrideMonth, 'yyyy-MM'), value);
    setOverrideAmount('');
    loadOverrides();
  };

  const handleDeleteOverride = async (month: string) => {
    await deleteThresholdOverride(month);
    loadOverrides();
  };

  const handleAddCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    await addCustomCategory(name, categoryType);
    setCategoryName('');
    loadCustomCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCustomCategory(id);
    loadCustomCategories();
  };

  return (
    <ScreenContainer>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {t('settings')}
      </Text>

      <View>
        <SectionHeader title={t('profile')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <TextInput
            label={t('yourName')}
            value={nameInput}
            onChangeText={setNameInput}
            onBlur={handleNameBlur}
            mode="outlined"
          />
        </View>
      </View>

      <View>
        <SectionHeader title={t('language')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <SegmentedButtons
            value={settings.language}
            onValueChange={(v) => updateSettings({ language: v as typeof settings.language })}
            buttons={[
              { value: 'en', label: 'English' },
              { value: 'bn', label: 'বাংলা' },
            ]}
          />
        </View>
      </View>

      <View>
        <SectionHeader title={t('monthlyThreshold')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
            {t('thresholdDesc')}
          </Text>
          <TextInput
            label={t('monthlyThresholdLabel')}
            value={thresholdInput}
            onChangeText={setThresholdInput}
            onBlur={handleThresholdBlur}
            keyboardType="decimal-pad"
            mode="outlined"
            left={<TextInput.Affix text={settings.currencySymbol} />}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            {t('majorAt')} {settings.majorThresholdPct}% · {t('criticalAt')} {settings.criticalThresholdPct}%
          </Text>
        </View>
      </View>

      <View>
        <SectionHeader title={t('perMonthOverrides')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, gap: 12 }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('perMonthOverridesDesc')}
          </Text>
          <DateField label={t('monthLabel')} value={overrideMonth} onChange={setOverrideMonth} />
          <TextInput
            label={t('monthlyThresholdLabel')}
            value={overrideAmount}
            onChangeText={setOverrideAmount}
            keyboardType="decimal-pad"
            mode="outlined"
            left={<TextInput.Affix text={settings.currencySymbol} />}
          />
          <Button
            mode="contained"
            icon="content-save-outline"
            onPress={handleSaveOverride}
            disabled={!overrideAmount}
            style={{ borderRadius: 14, alignSelf: 'flex-start' }}
          >
            {t('addOverride')}
          </Button>

          {overrides.length === 0 ? (
            <EmptyState icon="calendar-blank-outline" title={t('noOverridesYet')} />
          ) : (
            <View>
              {overrides.map((o) => (
                <View key={o.month} style={styles.overrideRow}>
                  <Text style={{ color: theme.colors.onSurface }}>
                    {format(new Date(`${o.month}-01T00:00:00`), 'MMM yyyy')}
                  </Text>
                  <View style={styles.overrideRowRight}>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatCurrency(o.threshold, settings.currencySymbol)}
                    </Text>
                    <IconButton
                      icon="trash-can-outline"
                      size={16}
                      onPress={() => handleDeleteOverride(o.month)}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View>
        <SectionHeader title={t('customCategories')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, gap: 12 }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('customCategoriesDesc')}
          </Text>
          <TextInput
            label={t('categoryNameLabel')}
            value={categoryName}
            onChangeText={setCategoryName}
            mode="outlined"
          />
          <SegmentedButtons
            value={categoryType}
            onValueChange={(v) => setCategoryType(v as CustomCategoryType)}
            buttons={[
              { value: 'income', label: t('income'), icon: 'cash-plus' },
              { value: 'expense', label: t('cost'), icon: 'cash-minus' },
            ]}
          />
          <Button
            mode="contained"
            icon="plus"
            onPress={handleAddCategory}
            disabled={!categoryName.trim()}
            style={{ borderRadius: 14, alignSelf: 'flex-start' }}
          >
            {t('addCategory')}
          </Button>

          {customCategories.length === 0 ? (
            <EmptyState icon="tag-outline" title={t('noCustomCategoriesYet')} />
          ) : (
            <View style={styles.chipsRow}>
              {customCategories.map((c) => (
                <Chip
                  key={c.id}
                  icon={c.type === 'income' ? 'cash-plus' : 'cash-minus'}
                  onClose={() => handleDeleteCategory(c.id)}
                  mode="outlined"
                >
                  {translateCategory(c.name, settings.language)}
                </Chip>
              ))}
            </View>
          )}
        </View>
      </View>

      <View>
        <SectionHeader title={t('currency')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <SegmentedButtons
            value={settings.currencySymbol}
            onValueChange={(v) => updateSettings({ currencySymbol: v })}
            buttons={[
              { value: '৳', label: '৳ BDT' },
              { value: '$', label: '$ USD' },
              { value: '₹', label: '₹ INR' },
            ]}
          />
        </View>
      </View>

      <View>
        <SectionHeader title={t('appearance')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <SegmentedButtons
            value={settings.themeMode}
            onValueChange={(v) => updateSettings({ themeMode: v as typeof settings.themeMode })}
            buttons={[
              { value: 'system', label: t('system') },
              { value: 'light', label: t('light') },
              { value: 'dark', label: t('dark') },
            ]}
          />
        </View>
      </View>

      <View>
        <SectionHeader title={t('security')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <List.Item
            title={t('appLockPin')}
            description={settings.appLockPinHash ? t('pinIsSet') : t('setPinToEnable')}
            left={(props) => <List.Icon {...props} icon="lock-outline" />}
            right={() => <Switch value={settings.appLockEnabled} onValueChange={handleToggleLock} />}
          />
          <Divider />
          <List.Item
            title={t('changePin')}
            left={(props) => <List.Icon {...props} icon="dialpad" />}
            onPress={() => navigation.navigate('SetPin')}
          />
          <Divider />
          <List.Item
            title={t('unlockBiometric')}
            description={t('useFingerprintFace')}
            left={(props) => <List.Icon {...props} icon="fingerprint" />}
            right={() => (
              <Switch
                value={settings.biometricEnabled}
                onValueChange={handleToggleBiometric}
                disabled={!settings.appLockEnabled}
              />
            )}
          />
        </View>
      </View>

      <View>
        <SectionHeader title={t('automation')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <List.Item
            title={t('recurringTransactions')}
            description={t('recurringTransactionsDesc')}
            left={(props) => <List.Icon {...props} icon="repeat" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('RecurringTransactions')}
          />
          <Divider />
          <List.Item
            title={t('backupRestore')}
            description={t('backupRestoreDesc')}
            left={(props) => <List.Icon {...props} icon="cloud-upload-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('BackupRestore')}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14 },
  overrideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  overrideRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
