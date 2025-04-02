"use client";

import { useEffect, useState } from "react";
import { useCurrentLocale, useChangeLocale, useSupportedLocales } from "@/i18n/hooks";
import { localeNames, Locale } from "@/i18n/settings";
import { useTranslations } from "@/i18n/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "minimal" }) {
  const t = useTranslations("common");
  const currentLocale = useCurrentLocale();
  const { change } = useChangeLocale();
  const supportedLocales = useSupportedLocales();
  const [mounted, setMounted] = useState(false);

  // 避免 SSR 水合不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelect = (locale: Locale) => {
    if (locale !== currentLocale) {
      change(locale);
    }
  };

  if (!mounted) {
    return null;
  }

  if (variant === "minimal") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("changeLanguage")}>
            <Globe className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {supportedLocales.map((locale) => (
            <DropdownMenuItem
              key={locale}
              onClick={() => handleSelect(locale)}
              className={cn(
                "flex items-center gap-2",
                currentLocale === locale && "font-medium"
              )}
            >
              {currentLocale === locale && <Check className="h-4 w-4" />}
              <span className={currentLocale !== locale ? "pl-6" : undefined}>
                {localeNames[locale]}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Globe className="h-4 w-4" />
          <span>{localeNames[currentLocale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLocales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSelect(locale)}
            className={cn(
              "flex items-center gap-2",
              currentLocale === locale && "font-medium"
            )}
          >
            {currentLocale === locale && <Check className="h-4 w-4" />}
            <span className={currentLocale !== locale ? "pl-6" : undefined}>
              {localeNames[locale]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 