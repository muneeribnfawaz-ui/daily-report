import { describe, it, expect } from "vitest";
import enTranslations from "@/lib/i18n/translations/en.json";
import arTranslations from "@/lib/i18n/translations/ar.json";
import { getInitialLanguage, isRTL, resolveTranslation } from "@/lib/i18n/context";

function getAllKeys(obj: Record<string, any>, prefix = ""): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe("i18n Internationalization Suite", () => {
  it("should have valid English and Arabic translations", () => {
    expect(enTranslations).toBeDefined();
    expect(arTranslations).toBeDefined();
    expect(typeof enTranslations).toBe("object");
    expect(typeof arTranslations).toBe("object");
  });

  it("should have 100% key parity between English and Arabic", () => {
    const enKeys = getAllKeys(enTranslations).sort();
    const arKeys = getAllKeys(arTranslations).sort();

    const missingInAr = enKeys.filter((k) => !arKeys.includes(k));
    const missingInEn = arKeys.filter((k) => !enKeys.includes(k));

    expect(missingInAr, `Keys missing in Arabic: ${missingInAr.join(", ")}`).toEqual([]);
    expect(missingInEn, `Keys missing in English: ${missingInEn.join(", ")}`).toEqual([]);
    expect(enKeys.length).toBeGreaterThan(150);
  });

  it("should have non-empty strings for all English and Arabic entries", () => {
    const enKeys = getAllKeys(enTranslations);
    for (const key of enKeys) {
      const enVal = resolveTranslation(enTranslations, key);
      const arVal = resolveTranslation(arTranslations, key);

      expect(typeof enVal, `Key ${key} in en.json must be string`).toBe("string");
      expect(typeof arVal, `Key ${key} in ar.json must be string`).toBe("string");
      expect(enVal?.trim().length, `Key ${key} in en.json must not be empty`).toBeGreaterThan(0);
      expect(arVal?.trim().length, `Key ${key} in ar.json must not be empty`).toBeGreaterThan(0);
    }
  });

  it("should correctly identify RTL for Arabic and LTR for English", () => {
    expect(isRTL("ar")).toBe(true);
    expect(isRTL("en")).toBe(false);
  });

  it("should default to English language", () => {
    expect(getInitialLanguage()).toBe("en");
  });

  it("should resolve nested translation keys properly", () => {
    expect(resolveTranslation(enTranslations, "common.save")).toBe("Save");
    expect(resolveTranslation(arTranslations, "common.save")).toBe("حفظ");
    expect(resolveTranslation(enTranslations, "nav.dashboard")).toBe("Dashboard");
    expect(resolveTranslation(arTranslations, "nav.dashboard")).toBe("لوحة التحكم");
    expect(resolveTranslation(enTranslations, "nav.dailyReports")).toBe("Daily Reports");
    expect(resolveTranslation(arTranslations, "nav.dailyReports")).toBe("التقارير اليومية");
    expect(resolveTranslation(enTranslations, "nav.users")).toBe("Users");
    expect(resolveTranslation(arTranslations, "nav.users")).toBe("المستخدمون");
    expect(resolveTranslation(enTranslations, "roles.admin")).toBe("Admin");
    expect(resolveTranslation(arTranslations, "roles.admin")).toBe("المسؤول");
    expect(resolveTranslation(enTranslations, "common.selectCeo")).toBe("Select CEO");
    expect(resolveTranslation(arTranslations, "common.selectCeo")).toBe("اختر الرئيس التنفيذي");
  });

  it("should interpolate dynamic parameters correctly in English and Arabic", () => {
    const enHodTemplate = resolveTranslation(enTranslations, "users.autoManagerHod");
    const arHodTemplate = resolveTranslation(arTranslations, "users.autoManagerHod");

    expect(enHodTemplate).toContain("{name}");
    expect(arHodTemplate).toContain("{name}");

    const enResult = enHodTemplate?.replace(/{name}/g, "John Doe");
    const arResult = arHodTemplate?.replace(/{name}/g, "جون دو");

    expect(enResult).toBe("HOD (Manager) is set automatically to John Doe.");
    expect(arResult).toBe("يتم تعيين رئيس القسم (جون دو) كمدير مباشر تلقائيًا.");
  });

  it("should handle pagination parameter interpolation in both languages", () => {
    const enShowing = resolveTranslation(enTranslations, "pagination.showing");
    const arShowing = resolveTranslation(arTranslations, "pagination.showing");

    expect(enShowing).toBe("Showing {from} to {to} of {total} results");
    expect(arShowing).toBe("عرض من {from} إلى {to} من أصل {total} نتيجة");

    const enInterpolated = enShowing
      ?.replace("{from}", "1")
      .replace("{to}", "10")
      .replace("{total}", "50");
    const arInterpolated = arShowing
      ?.replace("{from}", "1")
      .replace("{to}", "10")
      .replace("{total}", "50");

    expect(enInterpolated).toBe("Showing 1 to 10 of 50 results");
    expect(arInterpolated).toBe("عرض من 1 إلى 10 من أصل 50 نتيجة");
  });

  it("should have all 43 predefined skills with translations and descriptions in both languages", () => {
    const enSkills = (enTranslations as any).skills;
    const arSkills = (arTranslations as any).skills;

    expect(enSkills).toBeDefined();
    expect(arSkills).toBeDefined();
    expect(enSkills.descriptions).toBeDefined();
    expect(arSkills.descriptions).toBeDefined();

    expect(enSkills.frontendEngineer).toBe("Frontend Engineer");
    expect(arSkills.frontendEngineer).toBe("مهندس واجهات أمامية");
    expect(enSkills.civilEngineer).toBe("Civil Engineer");
    expect(arSkills.civilEngineer).toBe("مهندس مدني");
    expect(enSkills.accountant).toBe("Accountant");
    expect(arSkills.accountant).toBe("محاسب");
    expect(enSkills.growthMarketer).toBe("Growth Marketer");
    expect(arSkills.growthMarketer).toBe("مسوّق نمو وتطوير");
  });

  it("should have all department and password rule translations in both languages", () => {
    const enDept = (enTranslations as any).departments;
    const arDept = (arTranslations as any).departments;

    expect(enDept.software).toBe("Software");
    expect(arDept.software).toBe("البرمجيات");
    expect(enDept.marketing).toBe("Marketing");
    expect(arDept.marketing).toBe("التسويق");
    expect(enDept.finance).toBe("Finance");
    expect(arDept.finance).toBe("المالية");
    expect(enDept.construction).toBe("Construction");
    expect(arDept.construction).toBe("الإنشاءات");

    const enPass = (enTranslations as any).passwordRules;
    const arPass = (arTranslations as any).passwordRules;

    expect(enPass.strong).toBe("Strong Password");
    expect(arPass.strong).toBe("كلمة مرور قوية");
    expect(enPass.length).toBe("At least 8 characters long");
    expect(arPass.length).toBe("8 أحرف على الأقل");
  });
});
