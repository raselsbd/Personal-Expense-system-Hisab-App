import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from '../../i18n/useTranslation';
import { semantic } from '../../theme/colors';
import { exportBackup, importBackup, isValidBackupPayload } from '../../db/backupRepo';

export default function BackupRestoreScreen() {
  const theme = useTheme();
  const { refresh } = useSettings();
  const { t } = useTranslation();
  const colors = theme.dark ? semantic.dark : semantic.light;

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImportUri, setPendingImportUri] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setErrorMessage(null);
    try {
      const payload = await exportBackup();
      const file = new File(Paths.cache, `hisab-backup-${Date.now()}.json`);
      file.create({ overwrite: true });
      file.write(JSON.stringify(payload));

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: t('backupRestore') });
      }
      setResultMessage(t('exportSuccess'));
    } catch {
      setErrorMessage(t('exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handlePickImportFile = async () => {
    setErrorMessage(null);
    setResultMessage(null);
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled || result.assets.length === 0) return;
    setPendingImportUri(result.assets[0].uri);
    setConfirmVisible(true);
  };

  const handleConfirmImport = async () => {
    if (!pendingImportUri) return;
    setConfirmVisible(false);
    setImporting(true);
    setErrorMessage(null);
    try {
      const content = await new File(pendingImportUri).text();
      const parsed = JSON.parse(content);
      if (!isValidBackupPayload(parsed)) throw new Error('invalid');
      await importBackup(parsed);
      await refresh();
      setResultMessage(t('importSuccess'));
    } catch {
      setErrorMessage(t('importFailed'));
    } finally {
      setImporting(false);
      setPendingImportUri(null);
    }
  };

  return (
    <ScreenContainer>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
        {t('backupRestore')}
      </Text>

      <View>
        <SectionHeader title={t('exportBackup')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('exportBackupDesc')}
          </Text>
          <Button
            mode="contained"
            icon="tray-arrow-up"
            onPress={handleExport}
            loading={exporting}
            disabled={exporting}
            style={{ borderRadius: 14, marginTop: 12, alignSelf: 'flex-start' }}
          >
            {t('exportBackup')}
          </Button>
        </View>
      </View>

      <View>
        <SectionHeader title={t('importBackup')} />
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={styles.warningRow}>
            <MaterialCommunityIcons name="alert-outline" size={16} color={colors.major} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
              {t('importBackupDesc')}
            </Text>
          </View>
          <Button
            mode="outlined"
            icon="tray-arrow-down"
            onPress={handlePickImportFile}
            loading={importing}
            disabled={importing}
            style={{ borderRadius: 14, marginTop: 12, alignSelf: 'flex-start' }}
          >
            {t('importBackup')}
          </Button>
        </View>
      </View>

      {resultMessage ? (
        <Text style={{ color: colors.income }}>{resultMessage}</Text>
      ) : null}
      {errorMessage ? (
        <Text style={{ color: colors.expense }}>{errorMessage}</Text>
      ) : null}

      <Portal>
        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>{t('importBackup')}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{t('importConfirmMsg')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>{t('cancel')}</Button>
            <Button onPress={handleConfirmImport} textColor={colors.expense}>
              {t('confirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14 },
  warningRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
