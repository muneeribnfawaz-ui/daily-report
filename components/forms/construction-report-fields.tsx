"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";

type ConstructionReportFieldsProps = {
  workPlanItems: any[];
  setWorkPlanItems: (items: any[]) => void;
  materialItems: any[];
  setMaterialItems: (items: any[]) => void;
  tomorrowWorkPlanItems: any[];
  setTomorrowWorkPlanItems: (items: any[]) => void;
};

export function ConstructionReportFields({
  workPlanItems,
  setWorkPlanItems,
  materialItems,
  setMaterialItems,
  tomorrowWorkPlanItems,
  setTomorrowWorkPlanItems
}: ConstructionReportFieldsProps) {
  return (
    <div className="md:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Work Plan Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2a2 2 0 0 1 2 2v7"/><path d="M17 7h2a2 2 0 0 1 2 2v7"/></svg>
            </div>
            <div className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Work plan</div>
          </div>
          <Badge variant="soft" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{workPlanItems.length} items</Badge>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-12">S.No</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Activity</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[120px]">Location</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-28">Unit</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-32">Planned Qty</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-32">Executed Qty</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-32">% Completion</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Remarks</th>
                <th className="py-3 px-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {workPlanItems.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-2 px-3 text-slate-500 font-medium">{index + 1}</td>
                  <td className="py-2 px-1"><Input className="h-9" value={item.activity} onChange={(e) => { const next = [...workPlanItems]; next[index].activity = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" value={item.location} onChange={(e) => { const next = [...workPlanItems]; next[index].location = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" value={item.unit} onChange={(e) => { const next = [...workPlanItems]; next[index].unit = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" type="number" value={item.plannedQuantity} onChange={(e) => { const next = [...workPlanItems]; next[index].plannedQuantity = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" type="number" value={item.executedQuantity} onChange={(e) => { const next = [...workPlanItems]; next[index].executedQuantity = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" type="number" value={item.completionPercentage} onChange={(e) => { const next = [...workPlanItems]; next[index].completionPercentage = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" value={item.remarks} onChange={(e) => { const next = [...workPlanItems]; next[index].remarks = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-2 text-center">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setWorkPlanItems(workPlanItems.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-start">
            <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed border-slate-300 dark:border-slate-700" onClick={() => setWorkPlanItems([...workPlanItems, { activity: "", location: "", unit: "", plannedQuantity: "", executedQuantity: "", completionPercentage: "", remarks: "" }])}>
              <Plus className="h-4 w-4" /> Add Row
            </Button>
          </div>
        </div>
      </div>

      {/* Material Utilization Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
            </div>
            <div className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Material Utilization</div>
          </div>
          <Badge variant="soft" className="bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">{materialItems.length} items</Badge>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-12">S.No</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Material</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-28">Unit</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-36">Opening Stock</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-36">Received</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-36">Closing Stock</th>
                <th className="py-3 px-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {materialItems.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-2 px-3 text-slate-500 font-medium">{index + 1}</td>
                  <td className="py-2 px-1"><Input className="h-9" value={item.material} onChange={(e) => { const next = [...materialItems]; next[index].material = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" value={item.unit} onChange={(e) => { const next = [...materialItems]; next[index].unit = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" type="number" value={item.openingStock} onChange={(e) => { const next = [...materialItems]; next[index].openingStock = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" type="number" value={item.received} onChange={(e) => { const next = [...materialItems]; next[index].received = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" type="number" value={item.closingStock} onChange={(e) => { const next = [...materialItems]; next[index].closingStock = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-2 px-2 text-center">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setMaterialItems(materialItems.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-start">
            <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed border-slate-300 dark:border-slate-700" onClick={() => setMaterialItems([...materialItems, { material: "", unit: "", openingStock: "", received: "", closingStock: "" }])}>
              <Plus className="h-4 w-4" /> Add Row
            </Button>
          </div>
        </div>
      </div>

      {/* Tomorrow's Work Plan Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Tomorrow's Work Plan</div>
          </div>
          <Badge variant="soft" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">{tomorrowWorkPlanItems.length} items</Badge>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-12">S.No</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Activity</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 min-w-[150px]">Location</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-28">Unit</th>
                <th className="py-3 px-3 text-left font-semibold text-slate-600 dark:text-slate-400 w-36">Planned Quantity</th>
                <th className="py-3 px-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {tomorrowWorkPlanItems.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-2 px-3 text-slate-500 font-medium">{index + 1}</td>
                  <td className="py-2 px-1"><Input className="h-9" value={item.activity} onChange={(e) => { const next = [...tomorrowWorkPlanItems]; next[index].activity = e.target.value; setTomorrowWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" value={item.location} onChange={(e) => { const next = [...tomorrowWorkPlanItems]; next[index].location = e.target.value; setTomorrowWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" value={item.unit} onChange={(e) => { const next = [...tomorrowWorkPlanItems]; next[index].unit = e.target.value; setTomorrowWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-1"><Input className="h-9" type="number" value={item.plannedQuantity} onChange={(e) => { const next = [...tomorrowWorkPlanItems]; next[index].plannedQuantity = e.target.value; setTomorrowWorkPlanItems(next); }} /></td>
                  <td className="py-2 px-2 text-center">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setTomorrowWorkPlanItems(tomorrowWorkPlanItems.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-start">
            <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed border-slate-300 dark:border-slate-700" onClick={() => setTomorrowWorkPlanItems([...tomorrowWorkPlanItems, { activity: "", location: "", unit: "", plannedQuantity: "" }])}>
              <Plus className="h-4 w-4" /> Add Row
            </Button>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground italic flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        *Attach Site Execution Photos by pasting links into the Attachment Link field above.
      </p>
    </div>
  );
}
