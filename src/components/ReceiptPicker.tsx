import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, IconButton, Menu, useTheme } from 'react-native-paper';
import { pickReceiptFromCamera, pickReceiptFromLibrary } from '../utils/imageStorage';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  value: string | null;
  onChange: (uri: string | null) => void;
}

export function ReceiptPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);

  const handlePick = async (source: 'camera' | 'library') => {
    setMenuVisible(false);
    const uri = source === 'camera' ? await pickReceiptFromCamera() : await pickReceiptFromLibrary();
    if (uri) onChange(uri);
  };

  if (value) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: value }} style={styles.preview} />
        <IconButton
          icon="close-circle"
          size={22}
          style={[styles.removeBtn, { backgroundColor: theme.colors.surface }]}
          onPress={() => onChange(null)}
        />
      </View>
    );
  }

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <Button mode="outlined" icon="camera-plus-outline" onPress={() => setMenuVisible(true)} style={{ borderRadius: 12 }}>
          {t('attachReceipt')}
        </Button>
      }
    >
      <Menu.Item leadingIcon="camera-outline" title={t('takePhoto')} onPress={() => handlePick('camera')} />
      <Menu.Item leadingIcon="image-outline" title={t('chooseFromLibrary')} onPress={() => handlePick('library')} />
    </Menu>
  );
}

const styles = StyleSheet.create({
  previewWrap: { alignSelf: 'flex-start' },
  preview: { width: 88, height: 88, borderRadius: 12 },
  removeBtn: { position: 'absolute', top: -12, right: -12, margin: 0 },
});
