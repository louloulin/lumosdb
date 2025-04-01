import { defaultLocale, Locale, isValidLocale } from './settings';

const LOCALE_STORAGE_KEY = 'LUMOS_DB_LOCALE';

export interface LocalePersister {
  load: () => Locale | null;
  save: (locale: Locale) => void;
  clear: () => void;
}

export function createLocalStoragePersister(): LocalePersister {
  return {
    load: () => {
      try {
        if (typeof window === 'undefined') return defaultLocale;
        
        const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (storedLocale && isValidLocale(storedLocale)) {
          return storedLocale as Locale;
        }
        return null;
      } catch (error) {
        console.error('Error loading locale from localStorage', error);
        return null;
      }
    },
    save: (locale: Locale) => {
      try {
        if (typeof window === 'undefined') return;
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch (error) {
        console.error('Error saving locale to localStorage', error);
      }
    },
    clear: () => {
      try {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(LOCALE_STORAGE_KEY);
      } catch (error) {
        console.error('Error clearing locale from localStorage', error);
      }
    },
  };
} 