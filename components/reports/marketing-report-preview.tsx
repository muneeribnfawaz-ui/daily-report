import { cn } from "@/lib/utils";
import { ReportSheetEntry } from "./report-sheet-preview";

export function MarketingReportPreview({ report }: { report: ReportSheetEntry }) {
  const hasSelfItems = report.marketingSelfItems && report.marketingSelfItems.length > 0;
  const hasClientItems = report.marketingClientItems && report.marketingClientItems.length > 0;

  console.log("MARKETING REPORT PREVIEW", { reportName: report.name, hasSelfItems, hasClientItems, selfItems: report.marketingSelfItems, clientItems: report.marketingClientItems });

  if (!hasSelfItems && !hasClientItems) return null;

  return (
    <div className="flex flex-col border-t border-slate-200">
      {hasSelfItems && (
        <div className="bg-blue-50/60 px-4 py-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-blue-700">
            Self Report
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-blue-200">
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800">S.No</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800 min-w-[120px]">Executive</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800 min-w-[120px]">Client</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800 min-w-[120px]">Company</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800">Client Type</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800">Mobile No.</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800">Location</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800">Referred By</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800 min-w-[150px]">Discussion</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800">Interest</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800">Follow-up</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800">Status</th>
                  <th className="py-1.5 px-2 text-left font-bold text-blue-800 min-w-[120px]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {report.marketingSelfItems!.map((item, i) => (
                  <tr key={`self-${i}`} className="border-b border-blue-100 last:border-b-0">
                    <td className="py-1.5 px-2 text-slate-500 font-medium">{i + 1}</td>
                    <td className="py-1.5 px-2 text-slate-900 font-medium">{item.executiveName || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-900">{item.clientName || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-900">{item.companyName || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.clientType || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.mobileNo || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.location || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.referredBy || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.discussionSummary || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.interestLevel || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700 whitespace-nowrap">{item.followUpDate || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.status || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasClientItems && (
        <div className={cn("bg-purple-50/60 px-4 py-3", hasSelfItems && "border-t border-slate-200")}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-purple-700">
            Client Report
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-purple-200">
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800">S.No</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800 min-w-[120px]">Executive</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800 min-w-[120px]">Client</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800 min-w-[120px]">Company</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800">Client Type</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800 min-w-[120px]">Contact Person</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800">Mobile No.</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800">Email</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800 min-w-[120px]">Project Type</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800 min-w-[150px]">Requirement</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800">Project Stage</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800">Decision Maker</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800">Interest</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800 min-w-[120px]">Next Action</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800">Follow-up</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800">Status</th>
                  <th className="py-1.5 px-2 text-left font-bold text-purple-800 min-w-[120px]">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {report.marketingClientItems!.map((item, i) => (
                  <tr key={`client-${i}`} className="border-b border-purple-100 last:border-b-0">
                    <td className="py-1.5 px-2 text-slate-500 font-medium">{i + 1}</td>
                    <td className="py-1.5 px-2 text-slate-900 font-medium">{item.executiveName || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-900">{item.clientName || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-900">{item.companyName || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.clientType || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-900">{item.contactPerson || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.mobileNo || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.email || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.projectType || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.requirementDiscussed || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.projectStage || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.decisionMaker || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.interestLevel || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.nextAction || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700 whitespace-nowrap">{item.followUpDate || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.status || "—"}</td>
                    <td className="py-1.5 px-2 text-slate-700">{item.remarks || "—"}</td>
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
