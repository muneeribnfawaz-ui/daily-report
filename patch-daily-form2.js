const fs = require("fs");
const file = "components/forms/daily-report-form.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  /import \{ ReportField, ReportInput, ReportSelect, ReportTextarea \} from "@\/components\/forms\/report-controls";/,
  `import { ReportField, ReportInput, ReportSelect, ReportTextarea } from "@/components/forms/report-controls";\nimport { ConstructionReportFields } from "./construction-report-fields";`
);

code = code.replace(
  /<input type="hidden" \{\.\.\.register\("completedWork"\)\} \/>\n      <input type="hidden" \{\.\.\.register\("pendingWork"\)\} \/>\n      <input type="hidden" \{\.\.\.register\("blockers"\)\} \/>/,
  `{!isConstructionTeam ? (
        <>
          <input type="hidden" {...register("completedWork")} />
          <input type="hidden" {...register("pendingWork")} />
          <input type="hidden" {...register("blockers")} />
`
);

code = code.replace(
  /<ReportField className="md:col-span-2" label="Required clarification" error=\{errors\.requiredClarification\?\.message\}>\n        <ReportTextarea placeholder="Required Clarification" \{\.\.\.register\("requiredClarification"\)\} \/>\n      <\/ReportField>/,
  `          <ReportField className="md:col-span-2" label="Required clarification" error={errors.requiredClarification?.message}>
            <ReportTextarea placeholder="Required Clarification" {...register("requiredClarification")} />
          </ReportField>
        </>
      ) : (
        <ConstructionReportFields
          workPlanItems={workPlanItems}
          setWorkPlanItems={setWorkPlanItems}
          materialItems={materialItems}
          setMaterialItems={setMaterialItems}
          tomorrowWorkPlanItems={tomorrowWorkPlanItems}
          setTomorrowWorkPlanItems={setTomorrowWorkPlanItems}
        />
      )}`
);

fs.writeFileSync(file, code);
console.log("Patched render block.");
