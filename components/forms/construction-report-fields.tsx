"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <div className="md:col-span-2 space-y-8">
      {/* Work Plan Section */}
      <div className="rounded-2xl border border-slate-200 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">Work plan</div>
          <Badge variant="outline">{workPlanItems.length} items</Badge>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-12">S.No</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Activity</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Location</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-24">Unit</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-28">Planned Qty</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-28">Executed Qty</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-28">% Completion</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Remarks</th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {workPlanItems.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="py-2 px-3 text-slate-500 font-medium">{index + 1}</td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.activity} onChange={(e) => { const next = [...workPlanItems]; next[index].activity = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.location} onChange={(e) => { const next = [...workPlanItems]; next[index].location = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.unit} onChange={(e) => { const next = [...workPlanItems]; next[index].unit = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.plannedQuantity} onChange={(e) => { const next = [...workPlanItems]; next[index].plannedQuantity = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.executedQuantity} onChange={(e) => { const next = [...workPlanItems]; next[index].executedQuantity = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.completionPercentage} onChange={(e) => { const next = [...workPlanItems]; next[index].completionPercentage = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.remarks} onChange={(e) => { const next = [...workPlanItems]; next[index].remarks = e.target.value; setWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2 text-center"><button type="button" className="text-red-500 hover:bg-red-50 p-1 rounded" onClick={() => setWorkPlanItems(workPlanItems.filter((_, i) => i !== index))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setWorkPlanItems([...workPlanItems, { activity: "", location: "", unit: "", plannedQuantity: "", executedQuantity: "", completionPercentage: "", remarks: "" }])}>
          + Add Row
        </Button>
      </div>

      {/* Material Utilization Section */}
      <div className="rounded-2xl border border-slate-200 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">Material Utilization</div>
          <Badge variant="outline">{materialItems.length} items</Badge>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-12">S.No</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Material</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-24">Unit</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-32">Opening Stock</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-32">Received</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-32">Closing Stock</th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {materialItems.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="py-2 px-3 text-slate-500 font-medium">{index + 1}</td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.material} onChange={(e) => { const next = [...materialItems]; next[index].material = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.unit} onChange={(e) => { const next = [...materialItems]; next[index].unit = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.openingStock} onChange={(e) => { const next = [...materialItems]; next[index].openingStock = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.received} onChange={(e) => { const next = [...materialItems]; next[index].received = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.closingStock} onChange={(e) => { const next = [...materialItems]; next[index].closingStock = e.target.value; setMaterialItems(next); }} /></td>
                  <td className="py-1 px-2 text-center"><button type="button" className="text-red-500 hover:bg-red-50 p-1 rounded" onClick={() => setMaterialItems(materialItems.filter((_, i) => i !== index))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setMaterialItems([...materialItems, { material: "", unit: "", openingStock: "", received: "", closingStock: "" }])}>
          + Add Row
        </Button>
      </div>

      {/* Tomorrow's Work Plan Section */}
      <div className="rounded-2xl border border-slate-200 bg-white/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">Tomorrow's Work Plan</div>
          <Badge variant="outline">{tomorrowWorkPlanItems.length} items</Badge>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-12">S.No</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Activity</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300">Location</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-24">Unit</th>
                <th className="py-2.5 px-3 text-left font-semibold text-slate-600 dark:text-slate-300 w-32">Planned Quantity</th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {tomorrowWorkPlanItems.map((item, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="py-2 px-3 text-slate-500 font-medium">{index + 1}</td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.activity} onChange={(e) => { const next = [...tomorrowWorkPlanItems]; next[index].activity = e.target.value; setTomorrowWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.location} onChange={(e) => { const next = [...tomorrowWorkPlanItems]; next[index].location = e.target.value; setTomorrowWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.unit} onChange={(e) => { const next = [...tomorrowWorkPlanItems]; next[index].unit = e.target.value; setTomorrowWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2"><input type="text" className="w-full bg-transparent border-0 focus:ring-2 focus:ring-primary rounded p-1" value={item.plannedQuantity} onChange={(e) => { const next = [...tomorrowWorkPlanItems]; next[index].plannedQuantity = e.target.value; setTomorrowWorkPlanItems(next); }} /></td>
                  <td className="py-1 px-2 text-center"><button type="button" className="text-red-500 hover:bg-red-50 p-1 rounded" onClick={() => setTomorrowWorkPlanItems(tomorrowWorkPlanItems.filter((_, i) => i !== index))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setTomorrowWorkPlanItems([...tomorrowWorkPlanItems, { activity: "", location: "", unit: "", plannedQuantity: "" }])}>
          + Add Row
        </Button>
      </div>
      <p className="text-sm text-muted-foreground italic">*Attach Site Execution Photos by pasting links into the Attachment Link field above.</p>
    </div>
  );
}
