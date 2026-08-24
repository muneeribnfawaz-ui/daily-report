"use client";

import { ReportSheetEntry } from "./report-sheet-preview";

export function ConstructionReportPreview({ report }: { report: ReportSheetEntry }) {
  const hasWorkPlan = report.constructionWorkPlan && report.constructionWorkPlan.length > 0;
  const hasMaterial = report.constructionMaterialUtilization && report.constructionMaterialUtilization.length > 0;
  const hasTomorrow = report.constructionTomorrowWorkPlan && report.constructionTomorrowWorkPlan.length > 0;

  if (!hasWorkPlan && !hasMaterial && !hasTomorrow) return null;

  return (
    <div className="space-y-6 px-4 py-4 border-t border-slate-200">
      {hasWorkPlan && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">Work Plan</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold text-slate-600">S.No</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Activity</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Location</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Unit</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Planned Qty</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Executed Qty</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">% Completion</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.constructionWorkPlan?.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 text-slate-500">{i + 1}</td>
                    <td className="py-1.5 px-3">{item.activity || "-"}</td>
                    <td className="py-1.5 px-3">{item.location || "-"}</td>
                    <td className="py-1.5 px-3">{item.unit || "-"}</td>
                    <td className="py-1.5 px-3">{item.plannedQuantity || "-"}</td>
                    <td className="py-1.5 px-3">{item.executedQuantity || "-"}</td>
                    <td className="py-1.5 px-3">{item.completionPercentage || "-"}</td>
                    <td className="py-1.5 px-3">{item.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasMaterial && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">Material Utilization</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold text-slate-600">S.No</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Material</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Unit</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Opening Stock</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Received</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Closing Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.constructionMaterialUtilization?.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 text-slate-500">{i + 1}</td>
                    <td className="py-1.5 px-3">{item.material || "-"}</td>
                    <td className="py-1.5 px-3">{item.unit || "-"}</td>
                    <td className="py-1.5 px-3">{item.openingStock || "-"}</td>
                    <td className="py-1.5 px-3">{item.received || "-"}</td>
                    <td className="py-1.5 px-3">{item.closingStock || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasTomorrow && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">Tomorrow's Work Plan</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold text-slate-600">S.No</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Activity</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Location</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Unit</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Planned Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.constructionTomorrowWorkPlan?.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 text-slate-500">{i + 1}</td>
                    <td className="py-1.5 px-3">{item.activity || "-"}</td>
                    <td className="py-1.5 px-3">{item.location || "-"}</td>
                    <td className="py-1.5 px-3">{item.unit || "-"}</td>
                    <td className="py-1.5 px-3">{item.plannedQuantity || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
