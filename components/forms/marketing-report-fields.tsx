"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { isValidEmail } from "@/lib/validation";

type MarketingReportFieldsProps = {
  marketingSelfItems: any[];
  setMarketingSelfItems: (items: any[]) => void;
  marketingClientItems: any[];
  setMarketingClientItems: (items: any[]) => void;
};

export function MarketingReportFields({
  marketingSelfItems,
  setMarketingSelfItems,
  marketingClientItems,
  setMarketingClientItems,
}: MarketingReportFieldsProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="md:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Self Report Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Self Report</div>
          </div>
          <Badge variant="soft" className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">{marketingSelfItems.length} items</Badge>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-12">S.No</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Executive Name <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Client Name <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Company Name <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Client Type <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[140px]">Mobile No. <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Location <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Referred By <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[200px]">Discussion Summary <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Interest Level <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Follow-up Date <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Status <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Remarks</th>
                <th className="py-3 px-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {marketingSelfItems.map((item, index) => {
                const isMobileInvalid = Boolean(item.mobileNo && item.mobileNo.length > 0 && item.mobileNo.length < 10);
                return (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-medium align-top">{index + 1}</td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.executiveName} onChange={(e) => { const next = [...marketingSelfItems]; next[index].executiveName = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.clientName} onChange={(e) => { const next = [...marketingSelfItems]; next[index].clientName = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.companyName} onChange={(e) => { const next = [...marketingSelfItems]; next[index].companyName = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.clientType} onChange={(e) => { const next = [...marketingSelfItems]; next[index].clientType = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top">
                      <Input
                        className={`h-9 ${isMobileInvalid ? "border-red-500 focus-visible:ring-red-500 dark:border-red-500" : ""}`}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="10-digit mobile"
                        value={item.mobileNo ?? ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          const next = [...marketingSelfItems];
                          next[index].mobileNo = val;
                          setMarketingSelfItems(next);
                        }}
                      />
                      {isMobileInvalid && (
                        <p className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-1 leading-tight">
                          Mobile number must be exactly 10 digits.
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.location} onChange={(e) => { const next = [...marketingSelfItems]; next[index].location = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.referredBy} onChange={(e) => { const next = [...marketingSelfItems]; next[index].referredBy = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.discussionSummary} onChange={(e) => { const next = [...marketingSelfItems]; next[index].discussionSummary = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.interestLevel} onChange={(e) => { const next = [...marketingSelfItems]; next[index].interestLevel = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" type="date" min={tomorrowStr} value={item.followUpDate} onChange={(e) => { const next = [...marketingSelfItems]; next[index].followUpDate = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.status} onChange={(e) => { const next = [...marketingSelfItems]; next[index].status = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.remarks} onChange={(e) => { const next = [...marketingSelfItems]; next[index].remarks = e.target.value; setMarketingSelfItems(next); }} /></td>
                    <td className="py-2 px-2 text-center align-top">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setMarketingSelfItems(marketingSelfItems.filter((_, i) => i !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 flex justify-start">
            <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed border-slate-300 dark:border-slate-700" onClick={() => setMarketingSelfItems([...marketingSelfItems, { executiveName: "", clientName: "", companyName: "", clientType: "", mobileNo: "", location: "", referredBy: "", discussionSummary: "", interestLevel: "", followUpDate: "", status: "", remarks: "" }])}>
              <Plus className="h-4 w-4" /> Add Row
            </Button>
          </div>
        </div>
      </div>

      {/* Client Report Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Client Report</div>
          </div>
          <Badge variant="soft" className="bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">{marketingClientItems.length} items</Badge>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-12">S.No</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Executive Name <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Client Name <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Company Name <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Client Type <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Contact Person <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[140px]">Mobile No. <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[180px]">Email <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Project Type <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[200px]">Requirement Discussed <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Project Stage <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Decision Maker <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Interest Level <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Next Action <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Follow-up Date <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Status <span className="text-red-500">*</span></th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Remarks</th>
                <th className="py-3 px-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {marketingClientItems.map((item, index) => {
                const isMobileInvalid = Boolean(item.mobileNo && item.mobileNo.length > 0 && item.mobileNo.length < 10);
                const isEmailInvalid = Boolean(item.email && item.email.trim().length > 0 && !isValidEmail(item.email));
                return (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-medium align-top">{index + 1}</td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.executiveName} onChange={(e) => { const next = [...marketingClientItems]; next[index].executiveName = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.clientName} onChange={(e) => { const next = [...marketingClientItems]; next[index].clientName = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.companyName} onChange={(e) => { const next = [...marketingClientItems]; next[index].companyName = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.clientType} onChange={(e) => { const next = [...marketingClientItems]; next[index].clientType = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.contactPerson} onChange={(e) => { const next = [...marketingClientItems]; next[index].contactPerson = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top">
                      <Input
                        className={`h-9 ${isMobileInvalid ? "border-red-500 focus-visible:ring-red-500 dark:border-red-500" : ""}`}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="10-digit mobile"
                        value={item.mobileNo ?? ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          const next = [...marketingClientItems];
                          next[index].mobileNo = val;
                          setMarketingClientItems(next);
                        }}
                      />
                      {isMobileInvalid && (
                        <p className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-1 leading-tight">
                          Mobile number must be exactly 10 digits.
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-1 align-top">
                      <Input
                        className={`h-9 ${isEmailInvalid ? "border-red-500 focus-visible:ring-red-500 dark:border-red-500" : ""}`}
                        type="email"
                        placeholder="user@example.com"
                        value={item.email ?? ""}
                        onChange={(e) => {
                          const next = [...marketingClientItems];
                          next[index].email = e.target.value;
                          setMarketingClientItems(next);
                        }}
                      />
                      {isEmailInvalid && (
                        <p className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-1 leading-tight">
                          Please enter a valid email address.
                        </p>
                      )}
                    </td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.projectType} onChange={(e) => { const next = [...marketingClientItems]; next[index].projectType = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.requirementDiscussed} onChange={(e) => { const next = [...marketingClientItems]; next[index].requirementDiscussed = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.projectStage} onChange={(e) => { const next = [...marketingClientItems]; next[index].projectStage = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.decisionMaker} onChange={(e) => { const next = [...marketingClientItems]; next[index].decisionMaker = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.interestLevel} onChange={(e) => { const next = [...marketingClientItems]; next[index].interestLevel = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.nextAction} onChange={(e) => { const next = [...marketingClientItems]; next[index].nextAction = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" type="date" min={tomorrowStr} value={item.followUpDate} onChange={(e) => { const next = [...marketingClientItems]; next[index].followUpDate = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.status} onChange={(e) => { const next = [...marketingClientItems]; next[index].status = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-1 align-top"><Input className="h-9" value={item.remarks} onChange={(e) => { const next = [...marketingClientItems]; next[index].remarks = e.target.value; setMarketingClientItems(next); }} /></td>
                    <td className="py-2 px-2 text-center align-top">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setMarketingClientItems(marketingClientItems.filter((_, i) => i !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 flex justify-start">
            <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed border-slate-300 dark:border-slate-700" onClick={() => setMarketingClientItems([...marketingClientItems, { executiveName: "", clientName: "", companyName: "", clientType: "", contactPerson: "", mobileNo: "", email: "", projectType: "", requirementDiscussed: "", projectStage: "", decisionMaker: "", interestLevel: "", nextAction: "", followUpDate: "", status: "", remarks: "" }])}>
              <Plus className="h-4 w-4" /> Add Row
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

