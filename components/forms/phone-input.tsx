"use client";

import * as React from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllCountries,
  parsePhoneToParts,
  formatToE164,
  getMaxNationalLength,
  getCountryPlaceholder,
  CountryInfo,
  CountryCode
} from "@/lib/phone";
import { useTranslation } from "@/lib/i18n";

export interface PhoneInputProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  defaultCountry?: CountryCode;
  error?: boolean;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      id,
      name,
      value,
      defaultValue,
      onChange,
      onBlur,
      disabled = false,
      placeholder,
      className,
      defaultCountry = "IN",
      error = false
    },
    ref
  ) => {
    const { t } = useTranslation();
    const allCountries = React.useMemo(() => getAllCountries(), []);

    // Initial parsing
    const initialParsed = React.useMemo(() => {
      const initialVal = value !== undefined ? value : defaultValue || "";
      return parsePhoneToParts(initialVal, defaultCountry);
    }, [defaultValue, defaultCountry, value]);

    const [selectedCountryCode, setSelectedCountryCode] = React.useState<CountryCode>(
      initialParsed.countryCode || defaultCountry
    );
    const [nationalNumber, setNationalNumber] = React.useState<string>(
      initialParsed.nationalNumber || ""
    );
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    // Synchronize internal state if value prop changes externally
    React.useEffect(() => {
      if (value !== undefined) {
        const parsed = parsePhoneToParts(value, selectedCountryCode);
        if (parsed.countryCode && parsed.countryCode !== selectedCountryCode) {
          setSelectedCountryCode(parsed.countryCode);
        }
        const maxLen = getMaxNationalLength(parsed.countryCode || selectedCountryCode);
        const cleanNational = (parsed.nationalNumber || "").slice(0, maxLen);
        setNationalNumber(cleanNational);
      }
    }, [value, selectedCountryCode]);

    // Close dropdown on outside click
    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }
    }, [isOpen]);

    // Focus search input when dropdown opens
    React.useEffect(() => {
      if (isOpen) {
        setSearchQuery("");
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }, [isOpen]);

    const selectedCountry = React.useMemo(() => {
      return (
        allCountries.find((c) => c.isoCode === selectedCountryCode) ||
        allCountries.find((c) => c.isoCode === "IN") ||
        allCountries[0]
      );
    }, [allCountries, selectedCountryCode]);

    const filteredCountries = React.useMemo(() => {
      if (!searchQuery.trim()) return allCountries;
      const q = searchQuery.toLowerCase().trim();
      return allCountries.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.dialCode.toLowerCase().includes(q) ||
          c.isoCode.toLowerCase().includes(q)
      );
    }, [allCountries, searchQuery]);

    const currentMaxLength = getMaxNationalLength(selectedCountryCode);
    const currentPlaceholder = placeholder || getCountryPlaceholder(selectedCountryCode);

    const handleCountrySelect = (country: CountryInfo) => {
      setSelectedCountryCode(country.isoCode);
      setIsOpen(false);

      // Truncate national number if it exceeds new country's maximum length
      const newMaxLen = getMaxNationalLength(country.isoCode);
      const trimmedDigits = nationalNumber.slice(0, newMaxLen);
      setNationalNumber(trimmedDigits);

      // Emit new formatted phone number
      const e164 = trimmedDigits ? formatToE164(trimmedDigits, country.isoCode) : "";
      onChange?.(e164);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow only digits up to current country's max length
      const digits = raw.replace(/\D/g, "").slice(0, currentMaxLength);
      setNationalNumber(digits);

      const e164 = digits ? formatToE164(digits, selectedCountryCode) : "";
      onChange?.(e164);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text");
      if (pasted) {
        const parsed = parsePhoneToParts(pasted, selectedCountryCode);
        if (parsed.nationalNumber) {
          e.preventDefault();
          const targetCountry = parsed.countryCode || selectedCountryCode;
          const maxLen = getMaxNationalLength(targetCountry);
          const slicedNumber = parsed.nationalNumber.slice(0, maxLen);
          setSelectedCountryCode(targetCountry);
          setNationalNumber(slicedNumber);
          const e164 = formatToE164(slicedNumber, targetCountry);
          onChange?.(e164);
        }
      }
    };

    return (
      <div className={cn("relative flex w-full items-center gap-2", className)} ref={dropdownRef}>
        {/* Country Selector Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className={cn(
              "flex h-10 items-center justify-between gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm text-textPrimary shadow-sm transition-colors",
              "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-danger",
              isOpen && "ring-2 ring-ring"
            )}
          >
            <span className="text-base leading-none" role="img" aria-label={selectedCountry.name}>
              {selectedCountry.flag}
            </span>
            <span className="hidden font-medium sm:inline max-w-[100px] truncate text-xs sm:text-sm">
              {selectedCountry.name}
            </span>
            <span className="font-semibold text-textSecondary text-xs sm:text-sm">
              {selectedCountry.dialCode}
            </span>
            <ChevronDown className="h-4 w-4 text-textSecondary opacity-70 transition-transform duration-200" />
          </button>

          {/* Searchable Country Popover Dropdown */}
          {isOpen && (
            <div
              className={cn(
                "absolute left-0 rtl:left-auto rtl:right-0 top-full z-50 mt-1 max-h-72 w-72 rounded-lg border border-border bg-card shadow-lg flex flex-col overflow-hidden",
                "animate-in fade-in-0 zoom-in-95 duration-100"
              )}
            >
              {/* Search Bar */}
              <div className="sticky top-0 border-b border-border bg-card p-2">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 rtl:left-auto rtl:right-2.5 h-3.5 w-3.5 text-textSecondary" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("phone.searchPlaceholder", "Search country or code...")}
                    className="h-8 w-full rounded-md border border-input bg-background/50 pl-8 pr-2 rtl:pl-2 rtl:pr-8 text-xs text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setIsOpen(false);
                      } else if (e.key === "Enter" && filteredCountries.length > 0) {
                        e.preventDefault();
                        handleCountrySelect(filteredCountries[0]);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Country List */}
              <div className="overflow-y-auto max-h-56 divide-y divide-border/30">
                {filteredCountries.length === 0 ? (
                  <div className="py-4 text-center text-xs text-textSecondary">
                    {t("phone.noCountryFound", "No country found")}
                  </div>
                ) : (
                  filteredCountries.map((c) => {
                    const isSelected = c.isoCode === selectedCountryCode;
                    return (
                      <button
                        key={c.isoCode}
                        type="button"
                        onClick={() => handleCountrySelect(c)}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left rtl:text-right text-xs transition-colors hover:bg-accent/50",
                          isSelected && "bg-primary/10 font-semibold text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-base leading-none">{c.flag}</span>
                          <span className="truncate">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-2 rtl:pl-0 rtl:pr-2">
                          <span className="text-textSecondary">{c.dialCode}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* National Number Input */}
        <div className="relative flex-1">
          <input
            ref={ref}
            id={id}
            name={name}
            type="tel"
            maxLength={currentMaxLength}
            value={nationalNumber}
            onChange={handlePhoneChange}
            onPaste={handlePaste}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={currentPlaceholder}
            className={cn(
              "flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-textPrimary shadow-sm ring-offset-background placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-danger",
              className
            )}
          />
        </div>
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
