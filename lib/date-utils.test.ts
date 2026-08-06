import { describe, it, expect } from "vitest";
import { toDateInputValue, parseDateInputValue, getLeaveRequestDateWindow } from "./date-utils";

describe("Date Utilities & Window Calculations", () => {
  describe("toDateInputValue & parseDateInputValue", () => {
    it("formats Date object cleanly to YYYY-MM-DD with zero pad", () => {
      const sampleDate = new Date(2026, 3, 5); // April 5th, 2026 (month is 0-indexed in JS Date constructor)
      expect(toDateInputValue(sampleDate)).toBe("2026-04-05");
    });

    it("parses valid YYYY-MM-DD input string into matching Date instance", () => {
      const parsed = parseDateInputValue("2026-04-05");
      expect(Number.isNaN(parsed.getTime())).toBe(false);
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(3); // 3 is April
      expect(parsed.getDate()).toBe(5);
    });

    it("returns invalid Date object (NaN) when given malformed or empty inputs", () => {
      const invalidCases = ["", "invalid-string", "2026-XX-10", "2026-04"];
      for (const input of invalidCases) {
        const result = parseDateInputValue(input);
        expect(Number.isNaN(result.getTime()), `Input "${input}" should parse to NaN date`).toBe(true);
      }
    });
  });

  describe("getLeaveRequestDateWindow rolling horizon calculations", () => {
    it("computes 3-month rolling window cleanly within a standard calendar year", () => {
      const midAugust = new Date(2026, 7, 15); // August 15, 2026
      const window = getLeaveRequestDateWindow(midAugust);

      expect(window.startValue).toBe("2026-08-01");
      expect(window.endValue).toBe("2026-10-31"); // End of October 2026
    });

    it("computes 3-month window accurately across calendar year boundaries (November to January)", () => {
      const novemberDate = new Date(2026, 10, 20); // November 20, 2026
      const window = getLeaveRequestDateWindow(novemberDate);

      expect(window.startValue).toBe("2026-11-01");
      expect(window.endValue).toBe("2027-01-31"); // Automatically rolls over into January 31 of next year
    });

    it("computes window across leap year boundary (December to February in leap vs non-leap years)", () => {
      const december2027 = new Date(2027, 11, 10); // Dec 2027 -> Feb 2028 is a leap year!
      const window2028 = getLeaveRequestDateWindow(december2027);
      expect(window2028.startValue).toBe("2027-12-01");
      expect(window2028.endValue).toBe("2028-02-29"); // 2028 is leap year (29 days in Feb)

      const december2025 = new Date(2025, 11, 10); // Dec 2025 -> Feb 2026 is non-leap
      const window2026 = getLeaveRequestDateWindow(december2025);
      expect(window2026.startValue).toBe("2025-12-01");
      expect(window2026.endValue).toBe("2026-02-28"); // 2026 is non-leap (28 days in Feb)
    });
  });
});
