import { describe, it, expect } from "vitest";
import { toDateKey } from "./consolidated-report-data";

describe("Consolidated Report Data & Utilities", () => {
  describe("toDateKey defensive handling", () => {
    it("converts ISO strings and standard date strings to YYYY-MM-DD format", () => {
      expect(toDateKey("2026-08-06T14:22:30.000Z")).toBe("2026-08-06");
      expect(toDateKey("2026-01-01")).toBe("2026-01-01");
    });

    it("converts instantiated Date objects cleanly to YYYY-MM-DD format", () => {
      const d = new Date("2026-05-10T12:00:00.000Z");
      expect(toDateKey(d)).toBe("2026-05-10");
    });

    it("handles invalid or malformed date inputs safely without throwing RangeError exception", () => {
      const invalidInputs = ["", "invalid-date", "not a timestamp", "2026-99-99"];
      for (const input of invalidInputs) {
        expect(() => toDateKey(input)).not.toThrow();
        expect(toDateKey(input)).toBe("");
      }
    });
  });
});
