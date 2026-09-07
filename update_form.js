const fs = require('fs');

let content = fs.readFileSync('components/forms/construction-report-form.tsx', 'utf-8');

// Replace component names
content = content.replace(/DailyReportForm/g, 'ConstructionReportForm');
content = content.replace(/DailyReportValues/g, 'ConstructionReportValues');
// Remove Marketing fields
content = content.replace(/<MarketingReportFields[\s\S]*?\/>/, '');

// Remove standard report generic fields (Completed, Pending, Blockers, Clarification)
// Let's use string slice or regex to remove everything from `<div className="mt-8 space-y-6">` up to `<!-- END GENERAL FIELDS -->`
// Or just match the 4 specific ReportTextarea fields.
const fieldsToRemove = [
  'name="completedWork"',
  'name="pendingWork"',
  'name="blockers"',
  'name="requiredClarification"'
];

fieldsToRemove.forEach(f => {
  const regex = new RegExp(`<ReportTextarea[^>]*?${f}[\\s\\S]*?/>`, 'g');
  content = content.replace(regex, '');
});

content = content.replace(/<div className="text-xs font-semibold uppercase tracking-\[0\.25em\] text-muted-foreground">Completed Work<\/div>/, '');

// Save it back
fs.writeFileSync('components/forms/construction-report-form.tsx', content, 'utf-8');

console.log("Updated construction-report-form.tsx");
