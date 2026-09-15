"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { Language, Direction, LanguageContextType } from "./types";
import enTranslations from "./translations/en.json";
import arTranslations from "./translations/ar.json";

const translations: Record<Language, any> = {
  en: enTranslations,
  ar: arTranslations
};

const STORAGE_KEY = "app_language";
const COOKIE_NAME = "app_language";

export function isRTL(lang: Language): boolean {
  return lang === "ar";
}

export function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved === "en" || saved === "ar") return saved;

    const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (cookieMatch) {
      const cookieVal = decodeURIComponent(cookieMatch[1]) as Language;
      if (cookieVal === "en" || cookieVal === "ar") return cookieVal;
    }
  } catch {
    // Ignore storage errors
  }
  return "en";
}

export function resolveTranslation(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialLanguage();
    setLanguageState(initial);
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      const dir: Direction = isRTL(lang) ? "rtl" : "ltr";
      document.documentElement.setAttribute("lang", lang);
      document.documentElement.setAttribute("dir", dir);
      window.dispatchEvent(new CustomEvent("language-changed", { detail: lang }));
    } catch {
      // Ignore write errors
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const dir: Direction = isRTL(language) ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", dir);
  }, [language, mounted]);

  const t = useCallback(
    (
      key: string,
      paramsOrDefault?: Record<string, string | number> | string,
      defaultVal?: string
    ): string => {
      let params: Record<string, string | number> | undefined;
      let fallback = defaultVal;

      if (typeof paramsOrDefault === "string") {
        fallback = paramsOrDefault;
      } else if (paramsOrDefault && typeof paramsOrDefault === "object") {
        params = paramsOrDefault;
      }

      let text = resolveTranslation(translations[language], key);
      if (text === undefined && language !== "en") {
        text = resolveTranslation(translations.en, key);
      }
      if (text === undefined) {
        return fallback ?? key;
      }
      if (params) {
        for (const [paramKey, paramVal] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
        }
      }
      return text;
    },
    [language]
  );

  const direction: Direction = isRTL(language) ? "rtl" : "ltr";
  const rtl = direction === "rtl";

  const contextValue = useMemo(
    () => ({
      language,
      direction,
      setLanguage,
      t,
      isRTL: rtl
    }),
    [language, direction, setLanguage, t, rtl]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback safe context if called outside provider
    return {
      language: "en",
      direction: "ltr",
      setLanguage: () => {},
      t: (
        key: string,
        paramsOrDefault?: Record<string, string | number> | string,
        defaultVal?: string
      ) => {
        let params: Record<string, string | number> | undefined;
        let fallback = defaultVal;

        if (typeof paramsOrDefault === "string") {
          fallback = paramsOrDefault;
        } else if (paramsOrDefault && typeof paramsOrDefault === "object") {
          params = paramsOrDefault;
        }

        let text = resolveTranslation(enTranslations, key) ?? fallback ?? key;
        if (params) {
          for (const [paramKey, paramVal] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
          }
        }
        return text;
      },
      isRTL: false
    };
  }
  return context;
}

export function useTranslation() {
  const { t, language, direction, isRTL, setLanguage } = useLanguage();
  return { t, language, direction, isRTL, isRtl: isRTL, setLanguage };
}
