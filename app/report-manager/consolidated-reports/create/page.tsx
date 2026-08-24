import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReportField } from "@/components/forms/report-controls";
import { getCurrentUser } from "@/lib/auth";

export default async function CreateConsolidatedReportPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "team_lead" && user.role !== "report_manager" && user.role !== "hod" && user.role !== "admin" && user.role !== "ceo")) {
    redirect("/login");
  }

  return (
    <AppShell title="Create Consolidated Report" role={user.role}>
      <Card>
        <CardHeader>
          <CardTitle>New Consolidated Report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReportField label="Title">
            <Input placeholder="Title" />
          </ReportField>
          <ReportField label="Report date">
            <Input placeholder="Report Date" type="date" />
          </ReportField>
          <ReportField label="From date">
            <Input placeholder="From Date" type="date" />
          </ReportField>
          <ReportField label="To date">
            <Input placeholder="To Date" type="date" />
          </ReportField>
          <ReportField className="md:col-span-2" label="Team names">
            <Textarea placeholder="Team Names" />
          </ReportField>
          <ReportField className="md:col-span-2" label="Remarks">
            <Textarea placeholder="Remarks" />
          </ReportField>
          <Button className="md:col-span-2 w-fit">Generate</Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
