import { useTranslations as useNextIntlTranslations } from 'next-intl';
import { Locale, locales, defaultLocale } from './settings';
import { createLocalStoragePersister } from './storage';

// 本地存储持久器实例
const localStoragePersister = createLocalStoragePersister();

// 通用翻译钩子
export function useTranslations(namespace?: string) {
  return useNextIntlTranslations(namespace);
}

// 获取当前语言
export function useCurrentLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }
  const stored = localStoragePersister.load();
  return stored || defaultLocale;
}

// 获取所有支持的语言
export function useSupportedLocales() {
  return locales;
}

// 更改语言的钩子
export function useChangeLocale() {
  const change = (locale: Locale) => {
    if (!locales.includes(locale)) {
      console.error(`Unsupported locale: ${locale}`);
      return false;
    }
    
    localStoragePersister.save(locale);
    // 刷新页面应用新语言
    window.location.reload();
    return true;
  };
  
  return { change };
} 