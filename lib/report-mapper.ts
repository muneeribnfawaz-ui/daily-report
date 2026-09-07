export function mapReportRelations(report: any) {
  if (!report) return report;
  
  return {
    ...report,
    nextDayApprovalItems: report.approvalItems ?? [],
    constructionWorkPlan: report.workPlans ?? [],
    constructionMaterialUtilization: report.materialUtilizations ?? [],
    constructionTomorrowWorkPlan: report.tomorrowWorkPlans ?? [],
    marketingSelfItems: report.marketingSelfItems ?? [],
    marketingClientItems: report.marketingClientItems ?? [],
  };
}

export const reportRelationsInclude = {
  approvalItems: true,
  workPlans: true,
  materialUtilizations: true,
  tomorrowWorkPlans: true,
  marketingSelfItems: true,
  marketingClientItems: true,
};
