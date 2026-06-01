import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'am';
export type CalendarType = 'gregorian' | 'ethiopian';

const translations = {
  en: {
    welcome: 'Welcome back',
    staySafe: 'Stay safe on your journey',
    safeRoutes: 'Safe Routes',
    navigateSafely: 'Navigate safely',
    emergencySos: 'EMERGENCY SOS',
    iFeelUnsafe: 'I Feel Unsafe',
    recentAlerts: 'Recent Alerts',
    myProfile: 'My Profile',
    shareLocation: 'Share Location',
    safeContacts: 'Safe Contacts',
    noAlerts: 'No alerts yet.'
  },
  am: {
    welcome: 'እንኳን ደህና መጡ',
    staySafe: 'በጉዞዎ ላይ ደህንነትዎ የተጠበቀ ይሁን',
    safeRoutes: 'አስተማማኝ መንገዶች',
    navigateSafely: 'በደህና ይጓዙ',
    emergencySos: 'የድንገተኛ ጊዜ እርዳታ',
    iFeelUnsafe: 'ደህንነት አይሰማኝም',
    recentAlerts: 'የቅርብ ጊዜ ማንቂያዎች',
    myProfile: 'የግል ማህደር',
    shareLocation: 'አካባቢ ያጋሩ',
    safeContacts: 'አስተማማኝ አድራሻዎች',
    noAlerts: 'እስካሁን ምንም ማንቂያዎች የሉም'
  }
};

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  calendar: CalendarType;
  setCalendar: (cal: CalendarType) => void;
  t: (key: keyof typeof translations.en) => string;
  formatTimestamp: (isoString: string) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>('en');
  const [calendar, setCalState] = useState<CalendarType>('gregorian');

  useEffect(() => {
    AsyncStorage.getItem('prefs_lang').then(v => { if (v === 'am') setLangState('am'); });
    AsyncStorage.getItem('prefs_cal').then(v => { if (v === 'ethiopian') setCalState('ethiopian'); });
  }, []);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    AsyncStorage.setItem('prefs_lang', lang);
  };

  const setCalendar = (cal: CalendarType) => {
    setCalState(cal);
    AsyncStorage.setItem('prefs_cal', cal);
  };

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key];
  };

  const formatTimestamp = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (calendar === 'gregorian') {
      return date.toLocaleString();
    } else {
      // Basic mock for Ethiopian Calendar
      const ecYear = date.getFullYear() - 8;
      const ecMonth = date.getMonth() + 4 > 12 ? date.getMonth() + 4 - 12 : date.getMonth() + 4;
      return `${date.getDate()}/${ecMonth}/${ecYear} (EC) ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, calendar, setCalendar, t, formatTimestamp }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
