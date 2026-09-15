/**
 * Normalizes skill option names to camelCase keys used in i18n translation files.
 */
const SKILL_KEY_MAP: Record<string, string> = {
  "Frontend Engineer": "frontendEngineer",
  "Backend Engineer": "backendEngineer",
  "Full Stack Engineer": "fullStackEngineer",
  "Mobile Engineer": "mobileEngineer",
  "Cloud Engineer": "cloudEngineer",
  "Web Developer": "webDeveloper",
  "QA Engineer": "qaEngineer",
  "DevOps Engineer": "devOpsEngineer",
  "Data Engineer": "dataEngineer",
  "Security Engineer": "securityEngineer",
  "Product Manager": "productManager",
  "UI/UX Designer": "uiUxDesigner",
  "Technical Lead": "technicalLead",
  "Scrum Master": "scrumMaster",
  "Business Analyst": "businessAnalyst",
  "Support Engineer": "supportEngineer",
  "Civil Engineer": "civilEngineer",
  "Structural Engineer": "structuralEngineer",
  "Site Supervisor": "siteSupervisor",
  "Project Manager": "projectManager",
  "Safety Officer": "safetyOfficer",
  "Quantity Surveyor": "quantitySurveyor",
  "MEP Engineer": "mepEngineer",
  "Foreman": "foreman",
  "Estimator": "estimator",
  "Architect": "architect",
  "Financial Analyst": "financialAnalyst",
  "Accountant": "accountant",
  "Auditor": "auditor",
  "Payroll Specialist": "payrollSpecialist",
  "Tax Consultant": "taxConsultant",
  "Billing Manager": "billingManager",
  "Cashier / Petty Cash Custodian": "cashierPettyCashCustodian",
  "Treasury Analyst": "treasuryAnalyst",
  "Content Strategist": "contentStrategist",
  "SEO Specialist": "seoSpecialist",
  "Social Media Manager": "socialMediaManager",
  "Growth Marketer": "growthMarketer",
  "Brand Specialist": "brandSpecialist",
  "Campaign Manager": "campaignManager",
  "Performance Marketer": "performanceMarketer",
  "Copywriter": "copywriter",
  "Field Marketer": "fieldMarketer"
};

export function normalizeSkillKey(skillName: string): string {
  if (SKILL_KEY_MAP[skillName]) {
    return SKILL_KEY_MAP[skillName];
  }
  return skillName
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
}
