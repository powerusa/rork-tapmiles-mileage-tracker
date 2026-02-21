import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Translations,
  SupportedLocale,
  translationsMap,
  SUPPORTED_LOCALES,
} from '@/i18n/translations';

const STORAGE_KEY = 'tapmiles_locale';

function getDeviceLocale(): SupportedLocale {
  try {
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      const lang = nav?.language ?? nav?.languages?.[0] ?? 'en';
      const code = lang.split('-')[0].toLowerCase();
      console.log('TapMiles i18n: Web detected language:', lang, '-> code:', code);
      if (code in translationsMap) return code as SupportedLocale;
      return 'en';
    }

    const Localization = require('expo-localization');
    const locales = Localization.getLocales?.();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode?.toLowerCase() ?? 'en';
      console.log('TapMiles i18n: Device locale detected:', locales[0].languageTag, '-> code:', code);
      if (code in translationsMap) return code as SupportedLocale;
    }
  } catch (err) {
    console.log('TapMiles i18n: Error detecting locale:', err);
  }
  return 'en';
}

export const [I18nProvider, useI18n] = createContextHook(() => {
  const detectedLocale = useMemo(() => getDeviceLocale(), []);
  const [locale, setLocale] = useState<SupportedLocale>(detectedLocale);

  const storedLocaleQuery = useQuery({
    queryKey: ['locale'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('TapMiles i18n: Stored locale:', stored);
      return stored as SupportedLocale | null;
    },
  });

  useEffect(() => {
    if (storedLocaleQuery.data && storedLocaleQuery.data in translationsMap) {
      setLocale(storedLocaleQuery.data);
    }
  }, [storedLocaleQuery.data]);

  const persistLocale = useMutation({
    mutationFn: (loc: SupportedLocale) =>
      AsyncStorage.setItem(STORAGE_KEY, loc),
  });

  const changeLocale = useCallback(
    (loc: SupportedLocale) => {
      console.log('TapMiles i18n: Changing locale to:', loc);
      setLocale(loc);
      persistLocale.mutate(loc);
    },
    [persistLocale]
  );

  const t: Translations = useMemo(() => translationsMap[locale], [locale]);

  const deviceLocale = useMemo(() => detectedLocale, [detectedLocale]);

  const localeName = useMemo(
    () => SUPPORTED_LOCALES.find((l) => l.code === locale)?.name ?? 'English',
    [locale]
  );

  return {
    locale,
    deviceLocale,
    localeName,
    changeLocale,
    t,
    supportedLocales: SUPPORTED_LOCALES,
  };
});
