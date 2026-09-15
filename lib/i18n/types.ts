export type Language = "en" | "ar";
export type Direction = "ltr" | "rtl";

export interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (
    key: string,
    paramsOrDefault?: Record<string, string | number> | string,
    defaultVal?: string
  ) => string;
  isRTL: boolean;
}
