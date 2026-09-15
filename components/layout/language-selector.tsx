"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSelector({
  variant = "header",
  className
}: {
  variant?: "header" | "auth" | "compact";
  className?: string;
}) {
  const { language, setLanguage, isRTL, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = [
    { code: "en" as const, label: "English", nativeLabel: "English", flag: "🇬🇧" },
    { code: "ar" as const, label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦" }
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t("common.language")}
        className={cn(
          "h-9 gap-2 rounded-xl border-border bg-card/80 px-3 text-xs font-semibold text-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-card hover:text-primary",
          variant === "header" &&
            "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-foreground focus:ring-primary/40",
          variant === "auth" &&
            "border-cardBorder bg-card text-foreground hover:bg-accent/40",
          isOpen && "ring-2 ring-primary/40"
        )}
      >
        <Globe className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-medium">{currentLangObj.nativeLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t("common.language")}
          className={cn(
            "absolute z-50 mt-1.5 w-40 rounded-xl border border-border bg-card p-1 shadow-lg ring-1 ring-black/5 backdrop-blur-md animate-in fade-in-0 zoom-in-95",
            isRTL ? "left-0" : "right-0"
          )}
        >
          {languages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-primary/15 font-bold text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.nativeLabel}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
