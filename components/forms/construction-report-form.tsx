"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { dailyReportSchema } from "@/lib/validation";
import { api } from "@/lib/api";
import { formatDisplayName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SessionUser } from "@/lib/types";

import { ReportField, ReportInput, ReportSelect, ReportTextarea } from "@/components/forms/report-controls";
import { ConstructionReportFields } from "./construction-report-fields";
import { MarketingReportFields } from "./marketing-report-fields";

type ApprovalItem = {
  particulars: string;
  amountINR: number | string;
  amountRiyal: number | string;
};

type ConstructionReportValues = z.infer<typeof dailyReportSchema>;
type ReportItem = {
  _id?: string;
  id?: string;
  teamName: string;
  reportType: ConstructionReportValues["reportType"];
  reportDate: string;
  attachmentLink?: string;
  dailyMeetingUpdate?: string;
  completedWork: string;
  pendingWork: string;
  blockers: string;
  requiredClarification: string;
  isLocked: boolean;
  canEdit: boolean;
  editAccessRequested?: boolean;
  nextDayApprovalItems?: Array<{
    particulars: string;
    amountINR: number;
    amountRiyal: number;
    reason?: string;
    review?: string;
    approval?: string;
  }>;
  constructionWorkPlan?: any[];
  constructionMaterialUtilization?: any[];
  constructionTomorrowWorkPlan?: any[];
  marketingSelfItems?: any[];
  marketingClientItems?: any[];
};

type TeamOption = {
  value: string;
  label: string;
};

type TeamMeetingUpdateItem = {
  _id: string;
  name: string;
  employeeRole?: string | null;
  dailyMeetingUpdate?: string | null;
  reportDate?: string | Date;
};

export function ConstructionReportForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isActuallySubmitting, setIsActuallySubmitting] = useState(false);
  const [completedDraft, setCompletedDraft] = useState("");
  const [pendingDraft, setPendingDraft] = useState("");
  const [blockerDraft, setBlockerDraft] = useState("");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [pendingTasks, setPendingTasks] = useState<string[]>([]);
  const [blockerTasks, setBlockerTasks] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [workPlanItems, setWorkPlanItems] = useState<any[]>([]);
  const [materialItems, setMaterialItems] = useState<any[]>([]);
  const [tomorrowWorkPlanItems, setTomorrowWorkPlanItems] = useState<any[]>([]);
  const [marketingSelfItems, setMarketingSelfItems] = useState<any[]>([]);
  const [marketingClientItems, setMarketingClientItems] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const draftLoadedKeyRef = useRef<string | null>(null);
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });
  const showDailyMeetingUpdate = Boolean(currentUser);
  const {
    control,
    register,
    reset,
    setError,
    setValue,
    handleSubmit,
    clearErrors,
    formState: { errors }
  } = useForm<ConstructionReportValues>({
    defaultValues: {
      teamName: "",
      reportType: "Daily Update",
      reportDate: new Date().toISOString().slice(0, 10),
      attachmentLink: "",
      dailyMeetingUpdate: "",
      completedWork: "",
      pendingWork: "",
      blockers: "",
      requiredClarification: ""
    }
  });
  const watchedValues = useWatch({ control });
  const selectedReportDate = useWatch({ control, name: "reportDate" });
  const draftStorageKey =
    currentUser?.id && selectedReportDate && selectedTeam
      ? `daily-report-draft:${currentUser.id}:${selectedTeam}:${selectedReportDate}`
      : null;

  const [headerTeam, setHeaderTeam] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daily_report_selected_department");
      if (stored && stored !== "all" && stored !== "All") {
        setHeaderTeam(stored);
      }

      const handleDeptChange = (e: Event) => {
        const customEvent = e as CustomEvent<string>;
        if (customEvent.detail && customEvent.detail !== "all" && customEvent.detail !== "All") {
          setHeaderTeam(customEvent.detail);
        }
      };

      window.addEventListener("department-changed", handleDeptChange);
      return () => window.removeEventListener("department-changed", handleDeptChange);
    }
  }, []);

  const teamOptions = useMemo<TeamOption[]>(() => {
    const fromUser = (currentUser?.teamNames?.length ? currentUser.teamNames : currentUser?.teamName ? [currentUser.teamName] : [])
      .filter((teamName): teamName is string => Boolean(teamName && teamName.trim()));

    if (fromUser.length > 0) {
      return fromUser.map((teamName) => ({ value: teamName, label: formatDisplayName(teamName) }));
    }

    const deptNames = (currentUser?.departments ?? []).map((d: any) => d.name).filter(Boolean);
    if (deptNames.length > 0) {
      return deptNames.map((d) => ({ value: d, label: `${formatDisplayName(d)} Department` }));
    }

    return [];
  }, [currentUser?.teamName, currentUser?.teamNames, currentUser?.departments]);

  const defaultTeamName = useMemo(() => {
    if (headerTeam && headerTeam !== "all" && headerTeam !== "All") {
      return headerTeam;
    }
    return teamOptions[0]?.value ?? currentUser?.teamName?.trim() ?? "";
  }, [headerTeam, teamOptions, currentUser?.teamName]);

  const hasTeamAssignment = Boolean(defaultTeamName);

  useEffect(() => {
    if (defaultTeamName && !selectedTeam) {
      setValue("teamName", defaultTeamName, { shouldDirty: false, shouldValidate: true });
      setSelectedTeam(defaultTeamName);
    }
  }, [defaultTeamName, selectedTeam, setValue]);

  const resolvedSelectedTeam = selectedTeam || defaultTeamName;
  const isFinanceTeam = (currentUser?.departments ?? []).some((d: any) => (typeof d === "string" ? d : d.name) === "Finance") || resolvedSelectedTeam.toLowerCase().includes("finance");
  const isConstructionTeam = true;
  const showNextDayApproval = isFinanceTeam && !isHod && currentUser?.role !== "team_member";
  const isHod = currentUser?.role === "hod";

  const { data: teamMeetingUpdates } = useQuery({
    queryKey: ["team-meeting-updates", resolvedSelectedTeam, selectedReportDate],
    enabled: Boolean(currentUser?.role === "team_lead" && resolvedSelectedTeam && selectedReportDate),
    queryFn: async () => {
      const response = await api.get("/api/report-manager/reports", {
        params: {
          team: resolvedSelectedTeam,
          dateFrom: selectedReportDate,
          dateTo: selectedReportDate
        }
      });
      return (response.data?.data as TeamMeetingUpdateItem[]) ?? [];
    }
  });

  const { data: existingReports, refetch: refetchExistingReport } = useQuery({
    queryKey: ["my-report-for-date", currentUser?.id, selectedReportDate, resolvedSelectedTeam],
    enabled: Boolean(currentUser?.id && selectedReportDate && resolvedSelectedTeam),
    queryFn: async () => {
      const response = await api.get("/api/reports/my", {
        params: {
          date: selectedReportDate,
          team: resolvedSelectedTeam
        }
      });
      return response.data?.data as ReportItem[];
    }
  });
  const existingReport = useMemo(() => {
    if (!existingReports || existingReports.length === 0) return null;
    return existingReports.find((r) => r.teamName === resolvedSelectedTeam) ?? null;
  }, [existingReports, resolvedSelectedTeam]);
  const existingReportNeedsEditAccess = Boolean(existingReport && !existingReport.canEdit);

  const requestEditAccess = async () => {
    if (!existingReport) return;
    setMessage(null);
    try {
      const response = await api.post(`/api/reports/${existingReport._id || existingReport.id}/edit-request`, {});
      setMessage(response.data?.message ?? "Edit request sent.");
      await refetchExistingReport();
    } catch {
      setMessage("Failed to send edit request. Please try again.");
    }
  };

  useEffect(() => {
    if (currentUser?.role !== "team_lead") {
      setValue("reportDate", today);
    }
  }, [currentUser?.role, setValue, today]);

  useEffect(() => {
    if (!currentUser) return;

    if (!draftStorageKey) return;

    const storedDraft = window.localStorage.getItem(draftStorageKey);
    if (storedDraft) {
      try {
        const parsedDraft = JSON.parse(storedDraft) as {
          values?: Partial<ConstructionReportValues>;
          completedTasks?: string[];
          pendingTasks?: string[];
          blockerTasks?: string[];
          completedDraft?: string;
          pendingDraft?: string;
          blockerDraft?: string;
          workPlanItems?: any[]; materialItems?: any[]; tomorrowWorkPlanItems?: any[]; marketingSelfItems?: any[]; marketingClientItems?: any[]; };

        if (parsedDraft.values) {
          const draftTeamName = parsedDraft.values.teamName ?? defaultTeamName;
          reset({
            teamName: draftTeamName,
            reportType: parsedDraft.values.reportType ?? "Daily Update",
            reportDate: parsedDraft.values.reportDate ?? selectedReportDate ?? today,
            attachmentLink: parsedDraft.values.attachmentLink ?? "",
            dailyMeetingUpdate: parsedDraft.values.dailyMeetingUpdate ?? "",
            completedWork: parsedDraft.values.completedWork ?? "",
            pendingWork: parsedDraft.values.pendingWork ?? "",
            blockers: parsedDraft.values.blockers ?? "",
            requiredClarification: parsedDraft.values.requiredClarification ?? ""
          });
          setCompletedTasks(parsedDraft.completedTasks ?? []);
          setPendingTasks(parsedDraft.pendingTasks ?? []);
          setBlockerTasks(parsedDraft.blockerTasks ?? []);
          setCompletedDraft(parsedDraft.completedDraft ?? "");
          setPendingDraft(parsedDraft.pendingDraft ?? "");
          setBlockerDraft(parsedDraft.blockerDraft ?? "");
          setWorkPlanItems(parsedDraft.workPlanItems ?? []);
          setMaterialItems(parsedDraft.materialItems ?? []);
          setTomorrowWorkPlanItems(parsedDraft.tomorrowWorkPlanItems ?? []);
          setMarketingSelfItems(parsedDraft.marketingSelfItems ?? []);
          setMarketingClientItems(parsedDraft.marketingClientItems ?? []);
          setSelectedTeam(draftTeamName);
          draftLoadedKeyRef.current = draftStorageKey;
          return;
        }
      } catch {
        window.localStorage.removeItem(draftStorageKey);
      }
    }

    if (existingReport && existingReport.teamName === resolvedSelectedTeam) {
      setSelectedTeam(existingReport.teamName);
      reset({
        teamName: existingReport.teamName,
        reportType: existingReport.reportType,
        reportDate: new Date(existingReport.reportDate).toISOString().slice(0, 10),
        attachmentLink: existingReport.attachmentLink ?? "",
        dailyMeetingUpdate: existingReport.dailyMeetingUpdate ?? "",
        completedWork: existingReport.completedWork,
        pendingWork: existingReport.pendingWork,
        blockers: existingReport.blockers,
        requiredClarification: existingReport.requiredClarification
      });
      setCompletedTasks(existingReport.completedWork.split("\n").filter(Boolean));
      setPendingTasks(existingReport.pendingWork.split("\n").filter(Boolean));
      setBlockerTasks(existingReport.blockers.split("\n").filter(Boolean));
      setCompletedDraft(existingReport.completedWork);
      setPendingDraft(existingReport.pendingWork);
      setBlockerDraft(existingReport.blockers);
      setWorkPlanItems(existingReport.constructionWorkPlan ?? []);
      setMaterialItems(existingReport.constructionMaterialUtilization ?? []);
      setTomorrowWorkPlanItems(existingReport.constructionTomorrowWorkPlan ?? []);
      setMarketingSelfItems(existingReport.marketingSelfItems ?? []);
      setMarketingClientItems(existingReport.marketingClientItems ?? []);
          setApprovalItems(
        (existingReport.nextDayApprovalItems ?? []).map((item) => ({
          particulars: item.particulars ?? "",
          amountINR: item.amountINR ?? 0,
          amountRiyal: item.amountRiyal ?? 0
        }))
      );
      draftLoadedKeyRef.current = draftStorageKey;
      return;
    }

    const nextTeamName = selectedTeam || defaultTeamName;
    setSelectedTeam(nextTeamName);
    reset({
      teamName: nextTeamName,
      reportType: "Daily Update",
      reportDate: selectedReportDate ?? today,
      attachmentLink: "",
      dailyMeetingUpdate: "",
      completedWork: "",
      pendingWork: "",
      blockers: "",
      requiredClarification: ""
    });
    setCompletedTasks([]);
    setPendingTasks([]);
    setBlockerTasks([]);
    setCompletedDraft("");
    setPendingDraft("");
    setBlockerDraft("");
    setWorkPlanItems([]);
    setMaterialItems([]);
    setTomorrowWorkPlanItems([]);
    setMarketingSelfItems([]);
    setMarketingClientItems([]);
    draftLoadedKeyRef.current = draftStorageKey;
  }, [currentUser, defaultTeamName, draftStorageKey, existingReport, hasTeamAssignment, reset, selectedReportDate, selectedTeam, today]);

  useEffect(() => {
    setValue("completedWork", completedTasks.join("\n"), { shouldDirty: true });
  }, [completedTasks, setValue]);

  useEffect(() => {
    setValue("pendingWork", pendingTasks.join("\n"), { shouldDirty: true });
  }, [pendingTasks, setValue]);

  useEffect(() => {
    setValue("blockers", blockerTasks.join("\n"), { shouldDirty: true });
  }, [blockerTasks, setValue]);

  useEffect(() => {
    if (!draftStorageKey || draftLoadedKeyRef.current !== draftStorageKey) return;

    const currentTeamName = resolvedSelectedTeam;
    const hasAnyContent =
      watchedValues?.teamName?.trim() !== currentTeamName.trim() ||
      watchedValues?.reportType !== "Daily Update" ||
      watchedValues?.reportDate !== today ||
      Boolean(watchedValues?.attachmentLink?.trim()) ||
      Boolean(watchedValues?.dailyMeetingUpdate?.trim()) ||
      Boolean(watchedValues?.requiredClarification?.trim()) ||
      completedTasks.length > 0 ||
      pendingTasks.length > 0 ||
      blockerTasks.length > 0 ||
      Boolean(completedDraft.trim()) ||
      Boolean(pendingDraft.trim()) ||
      Boolean(blockerDraft.trim());

    if (!hasAnyContent) {
      window.localStorage.removeItem(draftStorageKey);
      return;
    }

    const draftPayload = {
      values: {
        ...watchedValues,
        completedWork: completedTasks.join("\n"),
        pendingWork: pendingTasks.join("\n"),
        blockers: blockerTasks.join("\n")
      },
      completedTasks,
      pendingTasks,
      blockerTasks,
      completedDraft,
      pendingDraft,
      blockerDraft,
      workPlanItems,
      materialItems,
      tomorrowWorkPlanItems,
      marketingSelfItems,
      marketingClientItems
    };

    window.localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload));
  }, [
    blockerDraft,
    blockerTasks,
    completedDraft,
    completedTasks,
    currentUser?.teamName,
    draftStorageKey,
    pendingDraft,
    pendingTasks,
    today,
    defaultTeamName,
    watchedValues,
    workPlanItems,
    materialItems,
    tomorrowWorkPlanItems,
    marketingSelfItems,
    marketingClientItems
  ]);

  const onSubmit = async (values: ConstructionReportValues) => {
    setMessage(null);
    if (existingReportNeedsEditAccess) {
      setMessage("Edit access is required before updating this report.");
      return;
    }
    if (!hasTeamAssignment) {
      setMessage("No team type is assigned to your account. Please ask an admin or manager to assign one before submitting reports.");
      return;
    }
    setIsActuallySubmitting(true);
    try {
      const resolvedTeamName = selectedTeam?.trim() || values.teamName?.trim() || defaultTeamName || currentUser?.teamName || "";
      const filteredApprovalItems = approvalItems
        .filter((item) => item.particulars.trim())
        .map((item) => ({
          particulars: item.particulars.trim(),
          amountINR: Number(item.amountINR) || 0,
          amountRiyal: Number(item.amountRiyal) || 0
        }));
      const parsed = dailyReportSchema.safeParse({
        ...values,
        teamName: resolvedTeamName,
        nextDayApprovalItems: showNextDayApproval ? filteredApprovalItems : [],
        constructionWorkPlan: isConstructionTeam ? workPlanItems : [],
        constructionMaterialUtilization: isConstructionTeam ? materialItems : [],
        constructionTomorrowWorkPlan: isConstructionTeam ? tomorrowWorkPlanItems : [],
        marketingSelfItems: [],
        marketingClientItems: []
      });
      if (!parsed.success) {
        clearErrors();
        for (const issue of parsed.error.issues) {
          const fieldName = issue.path[0];
          if (typeof fieldName === "string") {
            setError(fieldName as keyof ConstructionReportValues, {
              type: issue.code,
              message: issue.message
            });
          }
        }
        let hasMarketingError = false;
        const messages = parsed.error.issues.map((issue) => {
          if (issue.path[0] === "marketingSelfItems" || issue.path[0] === "marketingClientItems") {
            hasMarketingError = true;
            return null;
          }
          return issue.message;
        }).filter(Boolean);
        
        if (hasMarketingError) {
          messages.push("Please fill all mandatory fields (*) correctly in the Marketing tables.");
        }
        
        const uniqueMessages = Array.from(new Set(messages));
        setMessage(uniqueMessages.length ? uniqueMessages.join(" | ") : "Please fix the highlighted fields and try again.");
        return;
      }

      const localSelectedCompany = typeof window !== "undefined" ? localStorage.getItem("daily_report_selected_company") : null;
      const workspaceId = (localSelectedCompany && localSelectedCompany !== "all") ? localSelectedCompany : (currentUser?.workspaceId ?? null);
      const payload = { ...parsed.data, workspaceId };

      const response = existingReport
        ? await api.put(`/api/reports/${existingReport._id || existingReport.id}`, payload)
        : await api.post("/api/reports", payload);

      if (draftStorageKey) {
        draftLoadedKeyRef.current = "submitted";
        window.localStorage.removeItem(draftStorageKey);
      }

      const reportId = response.data?.data?._id || response.data?.data?.id || existingReport?._id || existingReport?.id;
      if (reportId) {
        router.push(`/daily-report/${reportId}/preview`);
        return;
      }

      setMessage(
        existingReport
          ? response.data?.message ?? "Report updated successfully."
          : response.data?.message ?? "Report submitted successfully."
      );
      await refetchExistingReport();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Submission failed. Please try again.";
      setMessage(errorMsg);
    } finally {
      setIsActuallySubmitting(false);
    }
  };

  if (existingReportNeedsEditAccess && existingReport) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{existingReport.teamName}</Badge>
            <Badge variant="outline">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(existingReport.reportDate))}</Badge>
            {existingReport.editAccessRequested ? <Badge variant="outline">Edit requested</Badge> : null}
          </div>
          <h3 className="mt-3 text-base font-semibold text-amber-950">Report already submitted</h3>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            This report cannot be edited from the create page until edit access is enabled by your team lead or manager.
          </p>
        </div>
        <div className="rounded-2xl border bg-background/70 p-4">
          
          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{existingReport.completedWork || "N/A"}</div>
        </div>
        {message ? <p className={`text-sm ${message.toLowerCase().includes("success") ? "text-success" : "text-destructive font-medium"}`}>{message}</p> : null}
        <Button type="button" disabled={Boolean(existingReport.editAccessRequested)} onClick={requestEditAccess}>
          {existingReport.editAccessRequested ? "Edit Requested" : "Request Edit Access"}
        </Button>
      </div>
    );
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <div className="md:col-span-2 rounded-2xl border bg-background/70 p-4">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Submitting as</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="soft">{currentUser?.name ?? "Loading user..."}</Badge>
          <span className="text-sm text-muted-foreground">{currentUser?.email ?? ""}</span>
          {resolvedSelectedTeam ? <Badge variant="outline">{formatDisplayName(resolvedSelectedTeam)}</Badge> : null}
          <Badge variant="soft" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Status: Draft</Badge>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Only completed work is required. All other fields are optional.</div>
      </div>
      {!hasTeamAssignment ? (
        <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
          No team type is assigned to this account yet, so reports cannot be submitted. Please contact an admin or your manager.
        </div>
      ) : null}

      {currentUser?.role === "team_lead" ? (
        <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/35">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-200">Team Meeting Updates</div>
              <p className="mt-2 text-sm text-muted-foreground dark:text-slate-300">
                Daily meeting points submitted by your team members for the selected date.
              </p>
            </div>
            <Badge variant="outline">{teamMeetingUpdates?.length ?? 0} updates</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {teamMeetingUpdates?.length ? (
              teamMeetingUpdates
                .filter((item) => item._id !== currentUser?.id && item.dailyMeetingUpdate?.trim())
                .map((item) => (
                  <div key={item._id} className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-900/50 dark:bg-slate-950/70 dark:shadow-none">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-foreground dark:text-slate-50">{item.name}</div>
                      {item.employeeRole ? (
                        <Badge variant="outline" className="dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-100">
                          {item.employeeRole === "team_lead" ? "Team Lead" : "Team Member"}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground dark:text-slate-200">
                      {item.dailyMeetingUpdate?.trim()}
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-xl border border-dashed border-amber-200 bg-white p-4 text-sm text-muted-foreground dark:border-amber-900/50 dark:bg-slate-950/60 dark:text-slate-400">
                No team member daily meeting updates found for this date.
              </div>
            )}
          </div>
        </div>
      ) : null}
      <ReportField label="Team / Department" error={errors.teamName?.message}>
        {teamOptions.length > 1 ? (
          <ReportSelect
            value={resolvedSelectedTeam}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedTeam(val);
              setValue("teamName", val, { shouldDirty: true, shouldValidate: true });
            }}
          >
            {teamOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </ReportSelect>
        ) : (
          <>
            <ReportInput disabled value={teamOptions[0]?.label || formatDisplayName(resolvedSelectedTeam)} />
            <input type="hidden" {...register("teamName")} value={resolvedSelectedTeam} />
          </>
        )}
      </ReportField>
      <ReportField label="Report type" error={errors.reportType?.message}>
        <ReportSelect {...register("reportType")}>
          {["Daily Update", "Bug Fix", "Meeting Notes", "Blocker", "Attendance", "Other"].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </ReportSelect>
      </ReportField>
      <ReportField className="md:col-span-2" label="Attachment link" error={errors.attachmentLink?.message}>
        <ReportInput
          type="url"
          inputMode="url"
          placeholder="Attachment link (optional)"
          {...register("attachmentLink")}
        />
      </ReportField>
      {showDailyMeetingUpdate ? (
        <ReportField
          className="md:col-span-2"
          label="Daily meeting update"
          helperText={
            "Optional. Add only points that were not already mentioned in the meeting."
          }
          error={errors.dailyMeetingUpdate?.message}
        >
          <ReportTextarea placeholder="Add any new meeting points here" {...register("dailyMeetingUpdate")} />
        </ReportField>
      ) : null}
      {!isConstructionTeam ? (
        <>
          <input type="hidden" {...register("completedWork")} />
          <input type="hidden" {...register("pendingWork")} />
          <input type="hidden" {...register("blockers")} />

      <ReportField
        className="md:col-span-2"
        label="Completed Work"
        required
        helperText="Required. Paste or type completed tasks (one per line)."
        error={errors.completedWork?.message}
      >
        <ReportTextarea
          placeholder="Paste your completed work here..."
          value={completedDraft}
          onChange={(event) => {
            const value = event.target.value;
            const tasks = value
              .split("\n")
              .map((task) => task.replace(/^[-•*]\s*/, "").trim())
              .filter(Boolean);
            setCompletedDraft(value);
            setCompletedTasks(tasks);
          }}
        />
      </ReportField>
      <ReportField
        className="md:col-span-2"
        label="Pending Work"
        helperText="Optional. Paste pending tasks, one per line."
        error={errors.pendingWork?.message}
      >
        <ReportTextarea
          placeholder="Paste pending work here..."
          value={pendingDraft}
          onChange={(event) => {
            const value = event.target.value;
            const tasks = value
              .split("\n")
              .map((task) => task.replace(/^[-•*]\s*/, "").trim())
              .filter(Boolean);
            setPendingDraft(value);
            setPendingTasks(tasks);
          }}
        />
      </ReportField>
      <ReportField
        className="md:col-span-2"
        label="Blockers"
        helperText="Optional. Paste blockers, one per line."
        error={errors.blockers?.message}
      >
        <ReportTextarea
          placeholder="Paste blockers here..."
          value={blockerDraft}
          onChange={(event) => {
            const value = event.target.value;
            const tasks = value
              .split("\n")
              .map((task) => task.replace(/^[-•*]\s*/, "").trim())
              .filter(Boolean);
            setBlockerDraft(value);
            setBlockerTasks(tasks);
          }}
        />
      </ReportField>
                <ReportField className="md:col-span-2" label="Required clarification" error={errors.requiredClarification?.message}>
            <ReportTextarea placeholder="Required Clarification" {...register("requiredClarification")} />
          </ReportField>
        </>
      ) : isConstructionTeam ? (
        <ConstructionReportFields
          workPlanItems={workPlanItems}
          setWorkPlanItems={setWorkPlanItems}
          materialItems={materialItems}
          setMaterialItems={setMaterialItems}
          tomorrowWorkPlanItems={tomorrowWorkPlanItems}
          setTomorrowWorkPlanItems={setTomorrowWorkPlanItems}
        />
      ) : null}
      {showNextDayApproval ? (
        <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/35">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-200">Next Day Approval Required</div>
              <p className="mt-1 text-sm text-muted-foreground dark:text-slate-300">
                Add items that need CEO approval for the next day. Reason, Review, and Approval will be filled by the CEO.
              </p>
            </div>
            <Badge variant="outline">{approvalItems.length} item{approvalItems.length === 1 ? "" : "s"}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200 dark:border-amber-800">
                  <th className="py-2 px-2 text-left text-xs font-semibold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200">Particulars</th>
                  <th className="py-2 px-2 text-left text-xs font-semibold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200 w-28">Amount (INR)</th>
                  <th className="py-2 px-2 text-left text-xs font-semibold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-200 w-28">Amount (Riyal)</th>
                  <th className="py-2 px-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {approvalItems.map((item, index) => (
                  <tr key={`approval-${index}`} className="border-b border-amber-100 dark:border-amber-900/40">
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="Enter particulars"
                        value={item.particulars}
                        onChange={(e) => {
                          const next = [...approvalItems];
                          next[index] = { ...next[index], particulars: e.target.value };
                          setApprovalItems(next);
                        }}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="0"
                        value={item.amountINR}
                        onChange={(e) => {
                          const next = [...approvalItems];
                          next[index] = { ...next[index], amountINR: e.target.value };
                          setApprovalItems(next);
                        }}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm dark:border-amber-800 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="0"
                        value={item.amountRiyal}
                        onChange={(e) => {
                          const next = [...approvalItems];
                          next[index] = { ...next[index], amountRiyal: e.target.value };
                          setApprovalItems(next);
                        }}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <button
                        type="button"
                        className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        onClick={() => {
                          setApprovalItems(approvalItems.filter((_, i) => i !== index));
                        }}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3 text-sm"
            onClick={() => setApprovalItems([...approvalItems, { particulars: "", amountINR: "", amountRiyal: "" }])}
          >
            + Add Item
          </Button>
        </div>
      ) : null}
      {message ? <p className={`text-sm md:col-span-2 ${message.toLowerCase().includes("success") ? "text-success" : "text-destructive font-medium"}`}>{message}</p> : null}
      <Button className="md:col-span-2 w-fit" type="submit" disabled={isActuallySubmitting || !hasTeamAssignment}>
        {isActuallySubmitting ? (existingReport ? "Saving..." : "Submitting...") : existingReport ? "Save Changes" : "Submit Report"}
      </Button>
    </form>
  );
}
