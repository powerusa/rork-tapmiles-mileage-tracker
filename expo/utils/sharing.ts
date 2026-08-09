import { Alert, Linking, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const ensureSharingAvailable = async () => {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
};

const cacheUri = (filename: string) => {
  if (!FileSystem.cacheDirectory) throw new Error('The cache directory is unavailable.');
  return `${FileSystem.cacheDirectory}${filename}`;
};

export const escapeCsv = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

export const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export async function shareCsvFile(filename: string, csv: string) {
  await ensureSharingAvailable();
  const uri = cacheUri(filename);
  await FileSystem.writeAsStringAsync(uri, `\uFEFF${csv}`, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Share TapMiles CSV report',
  });
}

export async function sharePdfFile(filename: string, html: string, dialogTitle: string) {
  await ensureSharingAvailable();
  const result = await Print.printToFileAsync({ html });
  const uri = cacheUri(filename);
  await FileSystem.deleteAsync(uri, { idempotent: true });
  await FileSystem.copyAsync({ from: result.uri, to: uri });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
}

export async function shareText(title: string, message: string) {
  await Share.share({ title, message });
}

async function openOrShare(url: string, title: string, message: string) {
  if (await Linking.canOpenURL(url)) {
    await Linking.openURL(url);
  } else {
    await shareText(title, message);
  }
}

export async function shareBySms(message: string) {
  const separator = Platform.OS === 'ios' ? '&' : '?';
  await openOrShare(`sms:${separator}body=${encodeURIComponent(message)}`, 'TapMiles trip', message);
}

export async function shareByEmail(subject: string, message: string) {
  const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  await openOrShare(url, subject, message);
}

export const showShareError = (error: unknown) => {
  console.error('TapMiles sharing error:', error);
  Alert.alert('Unable to Share', 'TapMiles could not create or share this file. Please try again.');
};

