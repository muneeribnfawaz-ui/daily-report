const fs = require('fs');

let content = fs.readFileSync('components/reports/edit-construction-report-form.tsx', 'utf-8');

content = content.replace(/EditReportForm/g, 'EditConstructionReportForm');
content = content.replace(/DailyReportValues/g, 'ConstructionReportValues');
content = content.replace(/DailyReportForm/g, 'ConstructionReportForm');
content = content.replace(/<MarketingReportFields[\s\S]*?\/>/, '');

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

fs.writeFileSync('components/reports/edit-construction-report-form.tsx', content, 'utf-8');

console.log("Updated edit-construction-report-form.tsx");
