import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { generateId } from './id';

async function persistPickedImage(sourceUri: string): Promise<string> {
  const ext = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
  const dest = new File(Paths.document, `receipt-${generateId()}.${ext}`);
  const source = new File(sourceUri);
  source.copy(dest);
  return dest.uri;
}

export async function pickReceiptFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return persistPickedImage(result.assets[0].uri);
}

export async function pickReceiptFromCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.6,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return persistPickedImage(result.assets[0].uri);
}

export function deleteReceiptPhoto(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup — a missing/locked file is not worth surfacing to the user.
  }
}
