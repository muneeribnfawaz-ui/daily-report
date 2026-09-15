"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import type { z } from "zod";
import { api } from "@/lib/api";
import { getLeaveRequestDateWindow, toDateInputValue } from "@/lib/date-utils";
import { leaveRequestSchema } from "@/lib/validation";
import {
  LEAVE_DURATION_LABELS,
  LEAVE_DURATION_OPTIONS,
  LEAVE_HALF_LABELS,
  LEAVE_HALF_OPTIONS,
  LEAVE_TYPE_OPTIONS,
  ROLE_LABELS
} from "@/lib/constants";
import type { SessionUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportField, ReportInput, ReportSelect, ReportTextarea } from "@/components/forms/report-controls";
import { useTranslation } from "@/lib/i18n";

type LeaveRequestValues = z.infer<typeof leaveRequestSchema>;

export function LeaveRequestCreateForm() {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const leaveDateWindow = getLeaveRequestDateWindow();
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm<LeaveRequestValues>({
    defaultValues: {
      leaveType: "Casual Leave",
      leaveDuration: "full_day",
      leaveHalf: undefined,
      fromDate: toDateInputValue(new Date()),
      toDate: toDateInputValue(new Date()),
      reason: ""
    }
  });

  const watchedLeaveDuration = useWatch({ control, name: "leaveDuration" });
  const watchedLeaveHalf = useWatch({ control, name: "leaveHalf" });
  const watchedFromDate = useWatch({ control, name: "fromDate" });
  const watchedToDate = useWatch({ control, name: "toDate" });

  useEffect(() => {
    if (watchedLeaveDuration === "half_day" && watchedFromDate && watchedToDate !== watchedFromDate) {
      setValue("toDate", watchedFromDate, { shouldValidate: true });
    }
  }, [setValue, watchedFromDate, watchedLeaveDuration, watchedToDate]);

  useEffect(() => {
    if (watchedLeaveDuration === "half_day" && !watchedLeaveHalf) {
      setValue("leaveHalf", "first_half", { shouldValidate: true });
    }
    if (watchedLeaveDuration === "full_day" && watchedLeaveHalf) {
      setValue("leaveHalf", undefined, { shouldValidate: true });
    }
  }, [setValue, watchedLeaveDuration, watchedLeaveHalf]);

  const onSubmit = async (values: LeaveRequestValues) => {
    setMessage(null);
    clearErrors();

    const normalizedValues = {
      ...values,
      leaveHalf: values.leaveDuration === "half_day" ? values.leaveHalf ?? "first_half" : undefined,
      toDate: values.leaveDuration === "half_day" ? values.fromDate : values.toDate
    };

    const parsed = leaveRequestSchema.safeParse(normalizedValues);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof LeaveRequestValues;
        if (fieldName) {
          setError(fieldName, {
            type: "manual",
            message: issue.message
          });
        }
      });
      setMessage(parsed.error.issues[0]?.message ?? t("validation.fixHighlighted", "Please fix the highlighted fields."));
      return;
    }

    try {
      await api.post("/api/leave-requests", parsed.data);
      setMessage(t("leave.submitSuccess", "Leave request submitted successfully."));
      reset({
        leaveType: parsed.data.leaveType,
        leaveDuration: parsed.data.leaveDuration,
        leaveHalf: parsed.data.leaveHalf ?? undefined,
        fromDate: parsed.data.fromDate,
        toDate: parsed.data.toDate,
        reason: ""
      });
    } catch {
      setMessage(t("leave.submitFailed", "Submission failed. Please try again."));
    }
  };

  const onInvalid = (validationErrors: FieldErrors<LeaveRequestValues>) => {
    const messages = Object.values(validationErrors)
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message));

    setMessage(messages.length ? messages.join(" | ") : t("validation.fixHighlightedAndRetry", "Please fix the highlighted fields and try again."));
  };

  const allowSelfService = currentUser?.role === "team_member" || currentUser?.role === "team_lead";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0">
            <Link href="/leave-requests" title={t("common.back", "Back")} aria-label={t("common.back", "Back")}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
          <CardTitle>{t("leave.createLeaveRequest", "Create Leave Request")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
            {currentUser?.role === "team_member"
              ? t("leave.teamMemberNotice", "Your request will go to your Team Lead first.")
              : currentUser?.role === "team_lead"
                ? t("leave.teamLeadNotice", "Team Leads can approve or reject requests from their members directly.")
                : t("leave.generalNotice", "Use this page to submit a new leave request.")}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft">{currentUser?.name ?? t("common.loading", "Loading user...")}</Badge>
            {currentUser?.teamName ? <Badge variant="outline">{currentUser.teamName}</Badge> : null}
            {currentUser?.role ? (
              <Badge variant="outline">
                {t(`roles.${currentUser.role}`, ROLE_LABELS[currentUser.role] ?? currentUser.role)}
              </Badge>
            ) : null}
          </div>

          {allowSelfService ? (
            <form className="grid gap-4" onSubmit={handleSubmit(onSubmit, onInvalid)}>
              <ReportField label={t("leave.leaveType", "Leave type")} required error={errors.leaveType?.message}>
                <ReportSelect {...register("leaveType")}>
                  {LEAVE_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </ReportSelect>
              </ReportField>
              <ReportField label={t("leave.leaveDuration", "Leave duration")} required error={errors.leaveDuration?.message}>
                <ReportSelect {...register("leaveDuration")}>
                  {LEAVE_DURATION_OPTIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {LEAVE_DURATION_LABELS[duration]}
                    </option>
                  ))}
                </ReportSelect>
              </ReportField>
              {watchedLeaveDuration === "half_day" ? (
                <ReportField label={t("leave.halfDaySlot", "Half day slot")} required error={errors.leaveHalf?.message}>
                  <ReportSelect {...register("leaveHalf")}>
                    <option value="">{t("leave.selectSlot", "Select slot")}</option>
                    {LEAVE_HALF_OPTIONS.map((half) => (
                      <option key={half} value={half}>
                        {LEAVE_HALF_LABELS[half]}
                      </option>
                    ))}
                  </ReportSelect>
                </ReportField>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <ReportField label={t("leave.fromDate", "From date")} required error={errors.fromDate?.message}>
                  <ReportInput
                    type="date"
                    min={leaveDateWindow.startValue}
                    max={leaveDateWindow.endValue}
                    {...register("fromDate")}
                  />
                </ReportField>
                <ReportField label={t("leave.toDate", "To date")} required error={errors.toDate?.message}>
                  <ReportInput
                    type="date"
                    min={watchedFromDate ?? leaveDateWindow.startValue}
                    max={leaveDateWindow.endValue}
                    {...register("toDate")}
                    disabled={watchedLeaveDuration === "half_day"}
                  />
                </ReportField>
              </div>
              {watchedLeaveDuration === "half_day" ? (
                <p className="text-xs text-textSecondary">{t("leave.halfDayNotice", "Half-day leave uses the same start and end date.")}</p>
              ) : null}
              <ReportField label={t("leave.reason", "Reason")} required error={errors.reason?.message}>
                <ReportTextarea placeholder={t("leave.reasonPlaceholder", "Reason for leave")} {...register("reason")} />
              </ReportField>
              {message ? <p className="text-sm text-success">{message}</p> : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("common.submitting", "Submitting...") : t("leave.sendRequest", "Send Request")}
              </Button>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">{t("leave.noSelfService", "Leave requests can be viewed from this page, but your role does not submit self-service requests.")}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
