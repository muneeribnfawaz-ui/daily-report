import { describe, it, expect } from "vitest";
import {
  getAllCountries,
  getCountryFlag,
  parsePhoneToParts,
  formatToE164,
  validateInternationalPhone,
  isDummyOrRepetitive,
  getMaxNationalLength,
  getCountryPlaceholder
} from "@/lib/phone";
import {
  tenDigitPhoneSchema,
  internationalPhoneSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema
} from "@/lib/validation";

describe("International Phone Number Support & Validation", () => {
  describe("Country-specific national length & metadata", () => {
    it("returns correct maximum national mobile length per country", () => {
      expect(getMaxNationalLength("IN")).toBe(10);
      expect(getMaxNationalLength("AE")).toBe(9);
      expect(getMaxNationalLength("US")).toBe(10);
      expect(getMaxNationalLength("CA")).toBe(10);
      expect(getMaxNationalLength("GB")).toBe(10);
      expect(getMaxNationalLength("SA")).toBe(9);
      expect(getMaxNationalLength("QA")).toBe(8);
      expect(getMaxNationalLength("OM")).toBe(8);
      expect(getMaxNationalLength("KW")).toBe(8);
      expect(getMaxNationalLength("BH")).toBe(8);
      expect(getMaxNationalLength("SG")).toBe(8);
      expect(getMaxNationalLength("MY")).toBe(10);
      expect(getMaxNationalLength("DE")).toBe(11);
      expect(getMaxNationalLength("CN")).toBe(11);
      expect(getMaxNationalLength("AU")).toBe(9);
    });

    it("generates appropriate country placeholders", () => {
      expect(getCountryPlaceholder("IN")).toBe("81234 56789");
      expect(getCountryPlaceholder("AE")).toBe("50 123 4567");
      expect(getCountryPlaceholder("US")).toBe("(201) 555-0123");
      expect(getCountryPlaceholder("GB")).toBe("7400 123456");
      expect(getCountryPlaceholder("SA")).toBe("51 234 5678");
    });
  });

  describe("India (+91) phone number validation", () => {
    it("accepts valid 10-digit Indian numbers", () => {
      const validNumbers = ["9876543210", "+919876543210", "+918123456789", "8123456789"];
      for (const num of validNumbers) {
        const validation = validateInternationalPhone(num, "IN");
        expect(validation.isValid).toBe(true);
        expect(validation.e164?.startsWith("+91")).toBe(true);
      }
    });

    it("strictly rejects 11-digit or invalid length Indian numbers (e.g. 90038494271)", () => {
      const invalidNumbers = [
        "90038494271", // 11 digits
        "+9190038494271",
        "987654321", // 9 digits (too short)
        "+91987654321",
        "98765432101", // 11 digits
        "+9198765432101",
        "987654321099999" // way too long
      ];
      for (const num of invalidNumbers) {
        const validation = validateInternationalPhone(num, "IN");
        expect(validation.isValid).toBe(false);
      }
    });
  });

  describe("UAE (+971) phone number validation", () => {
    it("accepts valid 9-digit UAE mobile numbers", () => {
      const validUAENumbers = [
        "501234567",
        "+971501234567",
        "521234567",
        "+971521234567",
        "551234567",
        "+971551234567",
        "+971541234567",
        "+971561234567",
        "+971581234567"
      ];
      for (const num of validUAENumbers) {
        const validation = validateInternationalPhone(num, "AE");
        expect(validation.isValid).toBe(true);
        expect(validation.e164?.startsWith("+971")).toBe(true);
      }
    });

    it("strictly rejects UAE overly long numbers (e.g. 785963214555877885444755521447)", () => {
      const invalidLongUAE = [
        "785963214555877885444755521447",
        "+971785963214555877885444755521447",
        "5012345678", // 10 digits (too long for UAE mobile)
        "+9715012345678"
      ];
      for (const num of invalidLongUAE) {
        const validation = validateInternationalPhone(num, "AE");
        expect(validation.isValid).toBe(false);
      }
    });

    it("strictly rejects UAE too-short numbers and invalid prefixes", () => {
      const invalidShortUAE = [
        "501234",
        "+971501234",
        "50123",
        "+97150123",
        "12345678" // Invalid prefix
      ];
      for (const num of invalidShortUAE) {
        const validation = validateInternationalPhone(num, "AE");
        expect(validation.isValid).toBe(false);
      }
    });
  });

  describe("USA (+1) phone number validation", () => {
    it("accepts valid 10-digit US numbers", () => {
      const validUS = ["4155552671", "+14155552671", "2015550123", "+12015550123"];
      for (const num of validUS) {
        const validation = validateInternationalPhone(num, "US");
        expect(validation.isValid).toBe(true);
        expect(validation.e164?.startsWith("+1")).toBe(true);
      }
    });

    it("strictly rejects 11-digit or too-short US numbers", () => {
      const invalidUS = ["41555526711", "+141555526711", "415555267", "+1415555267"];
      for (const num of invalidUS) {
        const validation = validateInternationalPhone(num, "US");
        expect(validation.isValid).toBe(false);
      }
    });
  });

  describe("UK (+44) phone number validation", () => {
    it("accepts valid 10-digit UK mobile numbers", () => {
      const validUK = ["7400123456", "+447400123456"];
      for (const num of validUK) {
        const validation = validateInternationalPhone(num, "GB");
        expect(validation.isValid).toBe(true);
        expect(validation.e164?.startsWith("+44")).toBe(true);
      }
    });

    it("strictly rejects too-short or overly long UK numbers", () => {
      const invalidUK = ["740012345", "+44740012345", "740012345678", "+44740012345678"];
      for (const num of invalidUK) {
        const validation = validateInternationalPhone(num, "GB");
        expect(validation.isValid).toBe(false);
      }
    });
  });

  describe("Saudi Arabia (+966) phone number validation", () => {
    it("accepts valid 9-digit Saudi mobile numbers", () => {
      const validSA = ["512345678", "+966512345678", "501234567", "+966501234567"];
      for (const num of validSA) {
        const validation = validateInternationalPhone(num, "SA");
        expect(validation.isValid).toBe(true);
        expect(validation.e164?.startsWith("+966")).toBe(true);
      }
    });

    it("strictly rejects too-short or 10-digit Saudi numbers", () => {
      const invalidSA = ["5123456789", "+9665123456789", "51234567", "+96651234567"];
      for (const num of invalidSA) {
        const validation = validateInternationalPhone(num, "SA");
        expect(validation.isValid).toBe(false);
      }
    });
  });

  describe("Countries with variable numbering lengths", () => {
    it("validates Malaysia (+60) variable lengths (9 or 10 digits)", () => {
      // 9 digits (012)
      expect(validateInternationalPhone("123456789", "MY").isValid).toBe(true);
      // 10 digits (011)
      expect(validateInternationalPhone("1112345678", "MY").isValid).toBe(true);
      // 11 digits (too long)
      expect(validateInternationalPhone("11123456789", "MY").isValid).toBe(false);
    });

    it("validates Germany (+49) mobile lengths (10 or 11 digits)", () => {
      expect(validateInternationalPhone("1701234567", "DE").isValid).toBe(true); // 10 digits (0170)
      expect(validateInternationalPhone("15123456789", "DE").isValid).toBe(true); // 11 digits (0151)
      expect(validateInternationalPhone("1512345678999", "DE").isValid).toBe(false); // Overly long
    });

    it("validates China (+86) mobile numbers (strictly 11 digits)", () => {
      expect(validateInternationalPhone("13800138000", "CN").isValid).toBe(true);
      expect(validateInternationalPhone("1380013800", "CN").isValid).toBe(false); // 10 digits
    });

    it("validates Singapore (+65) mobile numbers (strictly 8 digits)", () => {
      expect(validateInternationalPhone("81234567", "SG").isValid).toBe(true);
      expect(validateInternationalPhone("812345678", "SG").isValid).toBe(false); // 9 digits
    });
  });

  describe("Dummy and repetitive number checks", () => {
    it("rejects repetitive or sequential numbers across all countries", () => {
      expect(isDummyOrRepetitive("0000000000")).toBe(true);
      expect(isDummyOrRepetitive("1111111111")).toBe(true);
      expect(isDummyOrRepetitive("1234567890")).toBe(true);
      expect(validateInternationalPhone("+910000000000", "IN").isValid).toBe(false);
      expect(validateInternationalPhone("+11111111111", "US").isValid).toBe(false);
      expect(validateInternationalPhone("+971000000000", "AE").isValid).toBe(false);
    });
  });

  describe("E.164 formatting & parsing utilities", () => {
    it("formats national numbers cleanly to E.164 based on selected country", () => {
      expect(formatToE164("9876543210", "IN")).toBe("+919876543210");
      expect(formatToE164("501234567", "AE")).toBe("+971501234567");
      expect(formatToE164("4155552671", "US")).toBe("+14155552671");
      expect(formatToE164("7400123456", "GB")).toBe("+447400123456");
      expect(formatToE164("512345678", "SA")).toBe("+966512345678");
      expect(formatToE164("1112345678", "MY")).toBe("+601112345678");
    });

    it("parses phone numbers and respects country national lengths", () => {
      const inParts = parsePhoneToParts("+919876543210");
      expect(inParts.countryCode).toBe("IN");
      expect(inParts.nationalNumber).toBe("9876543210");
      expect(inParts.isValid).toBe(true);

      const aeParts = parsePhoneToParts("+971501234567");
      expect(aeParts.countryCode).toBe("AE");
      expect(aeParts.nationalNumber).toBe("501234567");
      expect(aeParts.isValid).toBe(true);

      // Paged/formatted paste parsing
      const pastedUS = parsePhoneToParts("+1 (415) 555-2671");
      expect(pastedUS.countryCode).toBe("US");
      expect(pastedUS.nationalNumber).toBe("4155552671");
      expect(pastedUS.isValid).toBe(true);
    });
  });

  describe("Zod validation schemas and backend API protection", () => {
    it("internationalPhoneSchema rejects invalid lengths and formats", () => {
      expect(internationalPhoneSchema.safeParse("+919876543210").success).toBe(true);
      expect(internationalPhoneSchema.safeParse("+9190038494271").success).toBe(false); // 11 digits rejected
      expect(internationalPhoneSchema.safeParse("+971501234567").success).toBe(true);
      expect(internationalPhoneSchema.safeParse("+971785963214555877885444755521447").success).toBe(false);
      expect(internationalPhoneSchema.safeParse("+14155552671").success).toBe(true);
      expect(internationalPhoneSchema.safeParse("+141555526711").success).toBe(false);
      expect(internationalPhoneSchema.safeParse("+447400123456").success).toBe(true);
      expect(internationalPhoneSchema.safeParse("+966512345678").success).toBe(true);
    });

    it("adminCreateUserSchema blocks backend bypass attempts", () => {
      const basePayload = {
        firstName: "Sarah",
        lastName: "Connor",
        empID: "EMP888",
        email: "sarah@example.com",
        password: "Password123!",
        role: "admin",
        roleTypes: ["Frontend Engineer"],
        departments: [{ name: "Software", subTeams: [] }],
        teamNames: ["Frontend Team"]
      };

      // Valid India
      expect(adminCreateUserSchema.safeParse({ ...basePayload, phone: "+919876543210" }).success).toBe(true);

      // Invalid India (11 digits bypass attempt)
      expect(adminCreateUserSchema.safeParse({ ...basePayload, phone: "+9190038494271" }).success).toBe(false);

      // Valid UAE
      expect(adminCreateUserSchema.safeParse({ ...basePayload, phone: "+971501234567" }).success).toBe(true);

      // Invalid UAE (overly long bypass attempt)
      expect(
        adminCreateUserSchema.safeParse({
          ...basePayload,
          phone: "+971785963214555877885444755521447"
        }).success
      ).toBe(false);
    });
  });
});
