import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  getExampleNumber,
  CountryCode
} from "libphonenumber-js/max";
import examples from "libphonenumber-js/examples.mobile.json";

export type { CountryCode };

export interface CountryInfo {
  isoCode: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

// Map of common/custom display names
const CUSTOM_COUNTRY_NAMES: Partial<Record<CountryCode, string>> = {
  IN: "India",
  US: "USA",
  GB: "UK",
  AE: "UAE",
  SA: "Saudi Arabia",
  QA: "Qatar",
  OM: "Oman",
  KW: "Kuwait",
  BH: "Bahrain",
  SG: "Singapore",
  MY: "Malaysia",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  CN: "China",
  JP: "Japan",
  BR: "Brazil",
  RU: "Russia",
  NZ: "New Zealand",
  IT: "Italy",
  ES: "Spain",
  ID: "Indonesia",
  PK: "Pakistan",
  BD: "Bangladesh",
  EG: "Egypt",
  ZA: "South Africa"
};

// Priority country ISO codes to list first in dropdown
const PRIORITY_COUNTRIES: CountryCode[] = [
  "IN",
  "US",
  "GB",
  "AE",
  "SA",
  "QA",
  "OM",
  "KW",
  "BH",
  "SG",
  "MY",
  "CA",
  "AU",
  "DE",
  "FR"
];

// Defined national mobile length limits for prominent countries
const MOBILE_MAX_LENGTHS: Partial<Record<CountryCode, number>> = {
  IN: 10, // India: strictly 10 digits
  AE: 9,  // UAE: strictly 9 digits (050, 052, 054, 055, 056, 058)
  US: 10, // USA: strictly 10 digits
  CA: 10, // Canada: strictly 10 digits
  GB: 10, // UK: strictly 10 digits mobile (07xxx)
  SA: 9,  // Saudi Arabia: strictly 9 digits (05x)
  QA: 8,  // Qatar: strictly 8 digits
  OM: 8,  // Oman: strictly 8 digits
  KW: 8,  // Kuwait: strictly 8 digits
  BH: 8,  // Bahrain: strictly 8 digits
  SG: 8,  // Singapore: strictly 8 digits
  MY: 10, // Malaysia: 9-10 digits
  AU: 9,  // Australia: 9 digits mobile (04xx)
  NZ: 10, // New Zealand: 8-10 digits
  FR: 9,  // France: 9 digits
  IT: 11, // Italy: 9-11 digits
  ES: 9,  // Spain: 9 digits
  DE: 11, // Germany: 10-11 digits
  CN: 11, // China: 11 digits
  JP: 11, // Japan: 10-11 digits
  BR: 11, // Brazil: 10-11 digits
  ID: 12, // Indonesia: 9-12 digits
  PH: 10, // Philippines: 10 digits
  PK: 10, // Pakistan: 10 digits
  BD: 10, // Bangladesh: 10 digits
  LK: 9,  // Sri Lanka: 9 digits
  NP: 10, // Nepal: 10 digits
  EG: 10, // Egypt: 10 digits
  ZA: 9,  // South Africa: 9 digits
  RU: 10  // Russia: 10 digits
};

/**
 * Derives maximum allowed national mobile length dynamically using libphonenumber-js metadata.
 */
export function getMaxNationalLength(countryCode: CountryCode): number {
  if (MOBILE_MAX_LENGTHS[countryCode]) {
    return MOBILE_MAX_LENGTHS[countryCode]!;
  }
  try {
    const ex = getExampleNumber(countryCode, examples);
    if (ex?.nationalNumber) {
      return ex.nationalNumber.length;
    }
  } catch {
    // fallback
  }
  return 15;
}

/**
 * Returns dynamic national placeholder based on standard country mobile format.
 */
export function getCountryPlaceholder(countryCode: CountryCode): string {
  try {
    const ex = getExampleNumber(countryCode, examples);
    if (ex) {
      return ex.formatNational().replace(/^0\s*/, "").trim();
    }
  } catch {
    // fallback
  }
  return "Enter phone number";
}

export function getCountryFlag(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2) return "🌐";
  const codePoints = isoCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

let cachedCountryList: CountryInfo[] | null = null;

export function getAllCountries(): CountryInfo[] {
  if (cachedCountryList) return cachedCountryList;

  let regionNames: Intl.DisplayNames | null = null;
  try {
    regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    // Fallback if Intl.DisplayNames is unavailable
  }

  const countries = getCountries();
  const list: CountryInfo[] = [];

  for (const isoCode of countries) {
    try {
      const dialCode = `+${getCountryCallingCode(isoCode)}`;
      const name =
        CUSTOM_COUNTRY_NAMES[isoCode] ||
        (regionNames ? regionNames.of(isoCode) : isoCode) ||
        isoCode;

      list.push({
        isoCode,
        name,
        dialCode,
        flag: getCountryFlag(isoCode)
      });
    } catch {
      // Ignore countries without valid calling code
    }
  }

  // Sort with priority countries first, then alphabetically by name
  const prioritySet = new Set(PRIORITY_COUNTRIES);
  const priorityItems: CountryInfo[] = [];
  const otherItems: CountryInfo[] = [];

  for (const p of PRIORITY_COUNTRIES) {
    const found = list.find((c) => c.isoCode === p);
    if (found) priorityItems.push(found);
  }

  for (const c of list) {
    if (!prioritySet.has(c.isoCode)) {
      otherItems.push(c);
    }
  }

  otherItems.sort((a, b) => a.name.localeCompare(b.name));

  cachedCountryList = [...priorityItems, ...otherItems];
  return cachedCountryList;
}

export function getCountryByIso(isoCode?: string | null): CountryInfo | null {
  if (!isoCode) return null;
  const list = getAllCountries();
  return list.find((c) => c.isoCode.toUpperCase() === isoCode.toUpperCase()) || null;
}

export function getCountryByDialCode(dialCode?: string | null): CountryInfo | null {
  if (!dialCode) return null;
  const normalized = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  const list = getAllCountries();
  return list.find((c) => c.dialCode === normalized) || null;
}

/**
 * Checks if the number is repetitive dummy (e.g. 0000000000, 1111111111, 1234567890)
 */
export function isDummyOrRepetitive(digits: string): boolean {
  const clean = digits.replace(/\D/g, "");
  if (!clean || clean.length < 4) return false;
  if (/^(\d)\1+$/.test(clean)) return true; // all same digits e.g. 00000, 111111
  if (clean === "1234567890" || clean === "0123456789" || clean === "987654321012") return true;
  return false;
}

/**
 * Parses any incoming phone string (E.164, national number with country or legacy 10-digit number)
 * into its country and national components.
 */
export function parsePhoneToParts(
  phone?: string | null,
  fallbackCountry: CountryCode = "IN"
): {
  countryCode: CountryCode;
  nationalNumber: string;
  e164: string;
  isValid: boolean;
} {
  if (!phone || typeof phone !== "string") {
    return {
      countryCode: fallbackCountry,
      nationalNumber: "",
      e164: "",
      isValid: false
    };
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return {
      countryCode: fallbackCountry,
      nationalNumber: "",
      e164: "",
      isValid: false
    };
  }

  // If starts with +, parse with libphonenumber-js
  if (trimmed.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(trimmed);
    if (parsed) {
      const detectedCountry = (parsed.country as CountryCode) || fallbackCountry;
      const isRepetitive = isDummyOrRepetitive(parsed.nationalNumber || "");
      const maxLen = getMaxNationalLength(detectedCountry);
      const nationalDigits = (parsed.nationalNumber || "").replace(/\D/g, "");
      const isValid = parsed.isValid() && !isRepetitive && nationalDigits.length <= maxLen;
      return {
        countryCode: detectedCountry,
        nationalNumber: nationalDigits.slice(0, maxLen),
        e164: isValid ? parsed.format("E.164") : trimmed,
        isValid
      };
    }
  }

  // Parse with fallback country
  const parsedWithFallback = parsePhoneNumberFromString(trimmed, fallbackCountry);
  if (parsedWithFallback) {
    const detectedCountry = (parsedWithFallback.country as CountryCode) || fallbackCountry;
    const isRepetitive = isDummyOrRepetitive(parsedWithFallback.nationalNumber || "");
    const maxLen = getMaxNationalLength(detectedCountry);
    const nationalDigits = (parsedWithFallback.nationalNumber || "").replace(/\D/g, "");
    const isValid = parsedWithFallback.isValid() && !isRepetitive && nationalDigits.length <= maxLen;
    return {
      countryCode: detectedCountry,
      nationalNumber: nationalDigits.slice(0, maxLen),
      e164: isValid ? parsedWithFallback.format("E.164") : trimmed,
      isValid
    };
  }

  // If starts with +, try matching dial code
  if (trimmed.startsWith("+")) {
    for (const c of getAllCountries()) {
      if (trimmed.startsWith(c.dialCode)) {
        const national = trimmed.slice(c.dialCode.length).replace(/\D/g, "");
        const maxLen = getMaxNationalLength(c.isoCode);
        const sliced = national.slice(0, maxLen);
        return {
          countryCode: c.isoCode,
          nationalNumber: sliced,
          e164: trimmed,
          isValid: false
        };
      }
    }
  }

  // Raw digits fallback
  const digits = trimmed.replace(/\D/g, "");
  const maxLen = getMaxNationalLength(fallbackCountry);
  const sliced = digits.slice(0, maxLen);
  return {
    countryCode: fallbackCountry,
    nationalNumber: sliced,
    e164: sliced ? `+${getCountryCallingCode(fallbackCountry)}${sliced}` : "",
    isValid: false
  };
}

/**
 * Formats countryCode and nationalNumber to standard E.164 format.
 */
export function formatToE164(
  phone: string,
  defaultCountry: CountryCode = "IN"
): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const parsed = trimmed.startsWith("+")
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(trimmed, defaultCountry);

  if (parsed && parsed.isValid()) {
    return parsed.format("E.164");
  }
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/[\s-]/g, "");
  }
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  const dialCode = getCountryCallingCode(defaultCountry);
  return `+${dialCode}${digits}`;
}

/**
 * Validates a phone number with country-specific validation.
 */
export function validateInternationalPhone(
  phone?: string | null,
  countryCode?: CountryCode
): { isValid: boolean; message?: string; e164?: string } {
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return { isValid: false, message: "Phone number is required" };
  }

  const trimmed = phone.trim();
  const defaultCountry: CountryCode = countryCode || "IN";
  
  // Parse with libphonenumber-js
  const parsed = trimmed.startsWith("+")
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(trimmed, defaultCountry);

  if (!parsed) {
    return {
      isValid: false,
      message: "Please enter a valid phone number"
    };
  }

  const detectedCountry = (parsed.country as CountryCode) || defaultCountry;
  const maxLen = getMaxNationalLength(detectedCountry);
  const nationalDigits = (parsed.nationalNumber || "").replace(/\D/g, "");
  const countryName = CUSTOM_COUNTRY_NAMES[detectedCountry] || detectedCountry || "selected country";

  // Check dummy / repetitive numbers
  if (isDummyOrRepetitive(nationalDigits)) {
    return {
      isValid: false,
      message: "Sequential or repetitive dummy numbers are not allowed"
    };
  }

  // Check length validation via validatePhoneNumberLength
  const lenStatus = trimmed.startsWith("+")
    ? validatePhoneNumberLength(trimmed)
    : validatePhoneNumberLength(trimmed, detectedCountry);

  if (lenStatus === "TOO_SHORT" || (nationalDigits.length > 0 && nationalDigits.length < maxLen && !parsed.isValid())) {
    return {
      isValid: false,
      message: `Phone number is too short for ${countryName}`
    };
  }

  if (lenStatus === "TOO_LONG" || nationalDigits.length > maxLen) {
    return {
      isValid: false,
      message: `Phone number is too long for ${countryName}`
    };
  }

  if (lenStatus === "INVALID_LENGTH") {
    return {
      isValid: false,
      message: `Invalid phone number length for ${countryName}`
    };
  }

  if (!parsed.isValid()) {
    return {
      isValid: false,
      message: `Invalid phone number format for ${countryName}`
    };
  }

  return {
    isValid: true,
    e164: parsed.format("E.164")
  };
}
