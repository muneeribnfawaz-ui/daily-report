const fs = require('fs');

let content = fs.readFileSync('components/reports/edit-marketing-report-form.tsx', 'utf-8');

content = content.replace(/EditReportForm/g, 'EditMarketingReportForm');
content = content.replace(/DailyReportValues/g, 'MarketingReportValues');
content = content.replace(/DailyReportForm/g, 'MarketingReportForm');
content = content.replace(/<ConstructionReportFields[\s\S]*?\/>/, '');

fs.writeFileSync('components/reports/edit-marketing-report-form.tsx', content, 'utf-8');

console.log("Updated edit-marketing-report-form.tsx");
