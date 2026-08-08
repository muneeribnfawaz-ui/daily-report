const fs = require("fs");

function patchApi(file) {
  let code = fs.readFileSync(file, "utf8");

  code = code.replace(
    /editAccessGranted\?: boolean \| null;\n\};/,
    `editAccessGranted?: boolean | null;
  constructionWorkPlan?: any[];
  constructionMaterialUtilization?: any[];
  constructionTomorrowWorkPlan?: any[];
};`
  );

  code = code.replace(
    /requiredClarification: report\.requiredClarification \?\? "",/,
    `requiredClarification: report.requiredClarification ?? "",
    constructionWorkPlan: report.constructionWorkPlan,
    constructionMaterialUtilization: report.constructionMaterialUtilization,
    constructionTomorrowWorkPlan: report.constructionTomorrowWorkPlan,`
  );

  fs.writeFileSync(file, code);
}

patchApi("app/api/report-manager/reports/route.ts");
// Single report view uses .lean() directly in most places but let's check
if (fs.existsSync("app/api/report-manager/reports/[id]/route.ts")) {
  let single = fs.readFileSync("app/api/report-manager/reports/[id]/route.ts", "utf8");
  if (single.includes("completedWork: report.completedWork ?? \"\",")) {
    patchApi("app/api/report-manager/reports/[id]/route.ts");
  }
}

console.log("Patched APIs.");
