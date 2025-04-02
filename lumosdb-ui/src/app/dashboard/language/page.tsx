"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "@/i18n/hooks";
import { useCurrentLocale, useChangeLocale, useSupportedLocales } from "@/i18n/hooks";
import { localeNames } from "@/i18n/settings";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Globe, Check, RefreshCw, ExternalLink, Languages, Search } from "lucide-react";
import { DocWrapper } from "@/components/doc-wrapper";
import { Input } from "@/components/ui/input";

export default function LanguagePage() {
  const t = useTranslations("language");
  const tCommon = useTranslations("common");
  const currentLocale = useCurrentLocale();
  const { change } = useChangeLocale();
  const supportedLocales = useSupportedLocales();
  const [selectedLocale, setSelectedLocale] = useState(currentLocale);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = () => {
    if (selectedLocale !== currentLocale) {
      change(selectedLocale);
      toast({
        title: t("changeSuccess"),
        description: t("restart"),
      });
    }
  };

  const handleReset = () => {
    setSelectedLocale(currentLocale);
  };

  // 过滤语言列表
  const filteredLocales = supportedLocales.filter((locale) => 
    localeNames[locale].toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 防止 SSR 不匹配
  if (!mounted) return null;

  return (
    <DocWrapper>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-2/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                {t("select")}
              </CardTitle>
              <CardDescription>
                {t("currentLanguage")}: {localeNames[currentLocale]}
              </CardDescription>
              <div className="mt-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchLanguage")}
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedLocale}
                onValueChange={(value: string) => setSelectedLocale(value as any)}
                className="space-y-3"
              >
                {filteredLocales.length > 0 ? (
                  filteredLocales.map((locale) => (
                    <div
                      key={locale}
                      className="flex items-center justify-between space-x-2 rounded-md border p-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={locale} id={locale} />
                        <Label
                          htmlFor={locale}
                          className="text-base font-medium cursor-pointer"
                        >
                          {localeNames[locale]}
                        </Label>
                      </div>
                      {currentLocale === locale && (
                        <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted">
                          {t("currentLanguage")}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {t("noLanguagesFound")}
                  </div>
                )}
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleReset} disabled={selectedLocale === currentLocale}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={selectedLocale === currentLocale}>
                <Check className="mr-2 h-4 w-4" />
                {tCommon("save")}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="md:w-1/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Languages className="mr-2 h-5 w-5" />
                {t("info")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="font-semibold">{t("languageSettings")}：</span>
                <span className="text-muted-foreground">
                  {t("languageSettingsInfo")}
                </span>
              </div>
              <div>
                <span className="font-semibold">{t("defaultLanguage")}：</span>
                <span className="text-muted-foreground">
                  {t("defaultLanguageInfo")}
                </span>
              </div>
              <div>
                <span className="font-semibold">{t("translationContribution")}：</span>
                <span className="text-muted-foreground">
                  {t("translationContributionInfo")}
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("contributeTranslation")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DocWrapper>
  );
} 