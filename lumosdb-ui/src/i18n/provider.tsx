"use client";

import { ReactNode, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { defaultLocale, Locale, locales } from "./settings";
import { createLocalStoragePersister } from "./storage";

// 导入所有语言包
import zhCN from "./messages/zh-CN.json";
import enUS from "./messages/en-US.json";
import jaJP from "./messages/ja-JP.json";
import koKR from "./messages/ko-KR.json";

const messages: Record<Locale, any> = {
  "zh-CN": zhCN,
  "en-US": enUS,
  "ja-JP": jaJP,
  "ko-KR": koKR,
};

// 创建本地存储持久器
const localStoragePersister = createLocalStoragePersister();

interface I18nProviderProps {
  children: ReactNode;
  locale?: Locale;
}

export function I18nProvider({ children, locale: propLocale }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale | null>(null);
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => {
    // 从存储中获取语言设置
    const storedLocale = localStoragePersister.load();
    // 使用prop传入的语言，如果没有则使用存储的语言，如果没有则使用浏览器语言，如果不支持则使用默认语言
    const browserLocale = navigator.language;
    const supportedLocale =
      propLocale ||
      (storedLocale && locales.includes(storedLocale as Locale)
        ? (storedLocale as Locale)
        : locales.includes(browserLocale as Locale)
        ? (browserLocale as Locale)
        : defaultLocale);

    setLocale(supportedLocale);
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [propLocale]);

  if (!locale || !timeZone) {
    return null; // 等待客户端加载
  }

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone={timeZone}
      now={new Date()}
    >
      {children}
    </NextIntlClientProvider>
  );
} 