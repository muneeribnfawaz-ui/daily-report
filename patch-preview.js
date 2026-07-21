const fs = require("fs");
const file = "components/reports/report-sheet-preview.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  /import \{ LEAVE_DURATION_LABELS, LEAVE_HALF_LABELS \} from "@\/lib\/constants";/,
  `import { LEAVE_DURATION_LABELS, LEAVE_HALF_LABELS } from "@/lib/constants";\nimport { ConstructionReportPreview } from "./construction-report-preview";`
);

code = code.replace(
  /employeeRole\?: string \| null;/,
  `employeeRole?: string | null;
  constructionWorkPlan?: Array<{ activity?: string; location?: string; unit?: string; plannedQuantity?: string; executedQuantity?: string; completionPercentage?: string; remarks?: string }>;
  constructionMaterialUtilization?: Array<{ material?: string; unit?: string; openingStock?: string; received?: string; closingStock?: string }>;
  constructionTomorrowWorkPlan?: Array<{ activity?: string; location?: string; unit?: string; plannedQuantity?: string }>;`
);

code = code.replace(
  /<DetailRow label="Required Clarification" value=\{report\.requiredClarification\} \/>\n      <\/div>/,
  `<DetailRow label="Required Clarification" value={report.requiredClarification} />
      </div>
      {report.teamName === "CONSTRUCTION" ? <ConstructionReportPreview report={report} /> : null}`
);

fs.writeFileSync(file, code);
console.log("Patched preview.");
