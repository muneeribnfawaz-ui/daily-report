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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportField, ReportInput, ReportSelect, ReportTextarea } from "@/components/forms/report-controls";

type LeaveRequestValues = z.infer<typeof leaveRequestSchema>;

export function LeaveRequestCreateForm() {
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
      setValue("toDate", watchedFromDate, { shouldDirty: true });
    }
    if (watchedLeaveDuration === "full_day" && watchedLeaveHalf) {
      setValue("leaveHalf", undefined, { shouldDirty: true });
    }
    if (watchedLeaveDuration === "full_day" && watchedFromDate && watchedToDate && watchedFromDate > watchedToDate) {
      setValue("toDate", watchedFromDate, { shouldDirty: true });
    }
  }, [setValue, watchedFromDate, watchedLeaveDuration, watchedLeaveHalf, watchedToDate]);

  const onSubmit = async (values: LeaveRequestValues) => {
    setMessage(null);
    try {
      const parsed = leaveRequestSchema.safeParse(values);
      if (!parsed.success) {
        clearErrors();

        for (const issue of parsed.error.issues) {
          const fieldName = issue.path[0];
          if (typeof fieldName === "string") {
            setError(fieldName as keyof LeaveRequestValues, {
              type: issue.code,
              message: issue.message
            });
          }
        }

        const messages = parsed.error.issues.map((issue) => issue.message).filter(Boolean);
        setMessage(messages.length ? messages.join(" | ") : "Please fix the highlighted fields and try again.");
        return;
      }

      const response = await api.post("/api/leave-requests", parsed.data);
      setMessage(response.data?.message ?? "Leave request submitted successfully.");
      reset({
        leaveType: parsed.data.leaveType,
        leaveDuration: parsed.data.leaveDuration,
        leaveHalf: parsed.data.leaveHalf ?? undefined,
        fromDate: parsed.data.fromDate,
        toDate: parsed.data.toDate,
        reason: ""
      });
    } catch {
      setMessage("Submission failed. Please try again.");
    }
  };

  const onInvalid = (validationErrors: FieldErrors<LeaveRequestValues>) => {
    const messages = Object.values(validationErrors)
      .map((error) => error?.message)
      .filter((message): message is string => Boolean(message));

    setMessage(messages.length ? messages.join(" | ") : "Please fix the highlighted fields and try again.");
  };

  const allowSelfService = currentUser?.role === "team_member" || currentUser?.role === "team_lead";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Leave Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
            {currentUser?.role === "team_member"
              ? "Your request will go to your Team Lead first."
              : currentUser?.role === "team_lead"
                ? "Team Leads can approve or reject requests from their members directly."
                : "Use this page to submit a new leave request."}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft">{currentUser?.name ?? "Loading user..."}</Badge>
            {currentUser?.teamName ? <Badge variant="outline">{currentUser.teamName}</Badge> : null}
            {currentUser?.role ? <Badge variant="outline">{ROLE_LABELS[currentUser.role]}</Badge> : null}
          </div>

          {allowSelfService ? (
            <form className="grid gap-4" onSubmit={handleSubmit(onSubmit, onInvalid)}>
              <ReportField label="Leave type" required error={errors.leaveType?.message}>
                <ReportSelect {...register("leaveType")}>
                  {LEAVE_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </ReportSelect>
              </ReportField>
              <ReportField label="Leave duration" required error={errors.leaveDuration?.message}>
                <ReportSelect {...register("leaveDuration")}>
                  {LEAVE_DURATION_OPTIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {LEAVE_DURATION_LABELS[duration]}
                    </option>
                  ))}
                </ReportSelect>
              </ReportField>
              {watchedLeaveDuration === "half_day" ? (
                <ReportField label="Half day slot" required error={errors.leaveHalf?.message}>
                  <ReportSelect {...register("leaveHalf")}>
                    <option value="">Select slot</option>
                    {LEAVE_HALF_OPTIONS.map((half) => (
                      <option key={half} value={half}>
                        {LEAVE_HALF_LABELS[half]}
                      </option>
                    ))}
                  </ReportSelect>
                </ReportField>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <ReportField label="From date" required error={errors.fromDate?.message}>
                  <ReportInput
                    type="date"
                    min={leaveDateWindow.startValue}
                    max={leaveDateWindow.endValue}
                    {...register("fromDate")}
                  />
                </ReportField>
                <ReportField label="To date" required error={errors.toDate?.message}>
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
                <p className="text-xs text-textSecondary">Half-day leave uses the same start and end date.</p>
              ) : null}
              <ReportField label="Reason" required error={errors.reason?.message}>
                <ReportTextarea placeholder="Reason for leave" {...register("reason")} />
              </ReportField>
              {message ? <p className="text-sm text-success">{message}</p> : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Send Request"}
              </Button>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">Leave requests can be viewed from this page, but your role does not submit self-service requests.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
