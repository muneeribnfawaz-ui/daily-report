const fs = require("fs");
const file = "components/forms/daily-report-form.tsx";
let code = fs.readFileSync(file, "utf8");

code = code.replace(
  /const isFinanceTeam = resolvedSelectedTeam === FINANCE_TEAM_NAME;/g,
  `const isFinanceTeam = resolvedSelectedTeam === FINANCE_TEAM_NAME;\n  const isConstructionTeam = resolvedSelectedTeam === "CONSTRUCTION";`
);

code = code.replace(
  /const \[approvalItems, setApprovalItems\] = useState<ApprovalItem\[\]>\(\[\]\);/g,
  `const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [workPlanItems, setWorkPlanItems] = useState<any[]>([]);
  const [materialItems, setMaterialItems] = useState<any[]>([]);
  const [tomorrowWorkPlanItems, setTomorrowWorkPlanItems] = useState<any[]>([]);`
);

code = code.replace(
  /const parsedDraft = JSON\.parse\(storedDraft\) as \{([^}]+)\};/g,
  (match, p1) => {
    return `const parsedDraft = JSON.parse(storedDraft) as {${p1} workPlanItems?: any[]; materialItems?: any[]; tomorrowWorkPlanItems?: any[]; };`;
  }
);

code = code.replace(
  /setApprovalItems\([\s\S]*?draftLoadedKeyRef\.current = draftStorageKey;/g,
  (match) => {
    return `setWorkPlanItems(parsedDraft.workPlanItems ?? []);
          setMaterialItems(parsedDraft.materialItems ?? []);
          setTomorrowWorkPlanItems(parsedDraft.tomorrowWorkPlanItems ?? []);
          ` + match;
  }
);
// Replace in existing report load
code = code.replace(
  /setApprovalItems\([\s\S]*?\)\);/g,
  (match) => {
    return match + `\n      setWorkPlanItems(existingReport.constructionWorkPlan ?? []);
      setMaterialItems(existingReport.constructionMaterialUtilization ?? []);
      setTomorrowWorkPlanItems(existingReport.constructionTomorrowWorkPlan ?? []);`;
  }
);

code = code.replace(
  /setApprovalItems\(\[\]\);\n    setCompletedTasks\(\[\]\);/g, // if it exists
  (match) => match
); // wait, where is it reset on clear?

code = code.replace(
  /setBlockerDraft\(""\);\n    draftLoadedKeyRef\.current = draftStorageKey;/g,
  `setBlockerDraft("");
    setWorkPlanItems([]);
    setMaterialItems([]);
    setTomorrowWorkPlanItems([]);
    draftLoadedKeyRef.current = draftStorageKey;`
);

code = code.replace(
  /blockerDraft\n    \};\n\n    window\.localStorage\.setItem/g,
  `blockerDraft,
      workPlanItems,
      materialItems,
      tomorrowWorkPlanItems
    };

    window.localStorage.setItem`
);

code = code.replace(
  /nextDayApprovalItems: isFinanceTeam \? filteredApprovalItems : \[\]\n      \}\);/g,
  `nextDayApprovalItems: isFinanceTeam ? filteredApprovalItems : [],
        constructionWorkPlan: isConstructionTeam ? workPlanItems : [],
        constructionMaterialUtilization: isConstructionTeam ? materialItems : [],
        constructionTomorrowWorkPlan: isConstructionTeam ? tomorrowWorkPlanItems : []
      });`
);

fs.writeFileSync(file, code);
console.log("Patched state and logic.");
