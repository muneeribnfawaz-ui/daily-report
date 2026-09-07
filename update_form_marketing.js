const fs = require('fs');

let content = fs.readFileSync('components/forms/marketing-report-form.tsx', 'utf-8');

// Replace component names
content = content.replace(/DailyReportForm/g, 'MarketingReportForm');
content = content.replace(/DailyReportValues/g, 'MarketingReportValues');
// Remove Construction fields
content = content.replace(/<ConstructionReportFields[\s\S]*?\/>/, '');

// Save it back
fs.writeFileSync('components/forms/marketing-report-form.tsx', content, 'utf-8');

console.log("Updated marketing-report-form.tsx");
