"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ReportField, ReportInput, ReportMultiSelectCards, ReportSelect } from "@/components/forms/report-controls";
import { api } from "@/lib/api";
import { DEPARTMENT_OPTIONS, MARKETING_SUB_TEAMS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import type { SessionUser } from "@/lib/types";

const teamTypeFormSchema = z.object({
  showName: z.string().min(2, "Team name is required"),
  department: z.string().min(1, "Department is required"),
  subTeams: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false)
});

type TeamTypeFormValues = z.infer<typeof teamTypeFormSchema>;

type TeamTypeRecord = TeamTypeFormValues & {
  _id: string;
  name: string;
  department?: string;
  subTeams?: string[];
  createdAt?: string;
  createdBy?: string;
};

const emptyValues: TeamTypeFormValues = {
  showName: "",
  department: "",
  subTeams: [],
  isActive: true,
  isDeleted: false
};

export function TeamTypeForm({
  mode,
  teamTypeId,
  onSaved,
  onCancel
}: {
  mode: "create" | "edit";
  teamTypeId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [record, setRecord] = useState<TeamTypeRecord | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });

  const availableDepartments = useMemo(() => {
    if (currentUser?.role === "hod" && currentUser.departments && currentUser.departments.length > 0) {
      return currentUser.departments.map((d) => d.name);
    }
    return DEPARTMENT_OPTIONS;
  }, [currentUser]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError: setFieldError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm<TeamTypeFormValues>({
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: emptyValues
  });

  const selectedDepartment = useWatch({ control, name: "department" });

  useEffect(() => {
    if (mode === "create") {
      let defaultDept = "";
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("daily_report_selected_department");
        if (stored && stored !== "all" && availableDepartments.includes(stored as any)) {
          defaultDept = stored;
        }
      }
      if (!defaultDept && availableDepartments.length > 0) {
        defaultDept = availableDepartments[0];
      }
      if (defaultDept) {
        reset({ ...emptyValues, department: defaultDept });
      }
    }
  }, [mode, availableDepartments, reset]);

  useEffect(() => {
    if (mode !== "edit" || !teamTypeId) return;

    let isSubscribed = true;
    const fetchTeamType = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/admin/team-types/${teamTypeId}`);
        const data = response.data?.data as TeamTypeRecord | undefined;
        if (!data || !isSubscribed) return;

        setRecord(data);
        reset({
          showName: data.showName || data.name,
          department: data.department || "",
          subTeams: data.subTeams || [],
          isActive: data.isActive ?? true,
          isDeleted: data.isDeleted ?? false
        });
      } catch (err: any) {
        if (!isSubscribed) return;
        const msg = err.response?.data?.message || err.message || "Failed to load team type.";
        setError(msg);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchTeamType();
    return () => {
      isSubscribed = false;
    };
  }, [mode, teamTypeId, reset]);

  const onSubmit = async (values: TeamTypeFormValues) => {
    setError(null);
    setMessage(null);

    let parsed: ReturnType<typeof teamTypeFormSchema.safeParse>;
    try {
      parsed = teamTypeFormSchema.safeParse(values);
    } catch {
      return;
    }

    if (!parsed.success) {
      clearErrors();
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path.join(".") as keyof TeamTypeFormValues;
        setFieldError(fieldName, {
          type: "manual",
          message: issue.message || "Invalid input"
        });
      });
      return;
    }

    const payload = parsed.data;

    try {
      if (mode === "create") {
        let activeWorkspaceId = currentUser?.workspaceId;
        if (typeof window !== "undefined") {
          const storedComp = localStorage.getItem("daily_report_selected_company");
          if (storedComp && storedComp !== "all") {
            activeWorkspaceId = storedComp;
          }
        }
        await api.post("/api/admin/team-types", { ...payload, workspaceId: activeWorkspaceId });
        setMessage(t("teamTypes.teamTypeCreated"));
      } else if (teamTypeId) {
        await api.patch(`/api/admin/team-types/${teamTypeId}`, payload);
        setMessage(t("teamTypes.teamTypeUpdated"));
      }
      setTimeout(() => {
        if (onSaved) onSaved();
      }, 500);
    } catch (requestError: any) {
      const errorData = axios.isAxiosError(requestError) ? requestError.response?.data : null;
      const responseMessage = errorData?.message ?? (axios.isAxiosError(requestError) ? requestError.message : null);
      setError(responseMessage ?? t("common.somethingWentWrong"));
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <ReportField label={t("common.department")} required error={errors.department?.message}>
        <ReportSelect
          {...register("department", {
            onChange: (e) => {
              if (e.target.value !== "Marketing") {
                setValue("subTeams", []);
              }
            }
          })}
        >
          <option value="">{t("teamTypes.selectDepartment")}</option>
          {availableDepartments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </ReportSelect>
      </ReportField>

      <ReportField label={t("teamTypes.teamName")} required error={errors.showName?.message}>
        <ReportInput placeholder={t("teamTypes.teamName")} {...register("showName")} />
      </ReportField>

      {selectedDepartment === "Marketing" && (
        <Controller
          control={control}
          name="subTeams"
          render={({ field }) => (
            <ReportMultiSelectCards
              label="Marketing Team Types (Sub-teams)"
              helperText="Choose team type classification for Marketing"
              error={errors.subTeams?.message}
              value={field.value ?? []}
              onChange={field.onChange}
              options={MARKETING_SUB_TEAMS.map((sub) => ({
                value: sub,
                label: sub
              }))}
            />
          )}
        />
      )}

      {mode === "edit" ? (
        <>
          <ReportField label={t("common.status")} error={errors.isActive?.message}>
            <ReportSelect {...register("isActive", { setValueAs: (value) => String(value) === "true" })}>
              <option value="true">{t("common.active")}</option>
              <option value="false">{t("common.inactive")}</option>
            </ReportSelect>
          </ReportField>
          <ReportField label="Deleted" error={errors.isDeleted?.message}>
            <ReportSelect {...register("isDeleted", { setValueAs: (value) => String(value) === "true" })}>
              <option value="false">Not deleted</option>
              <option value="true">Deleted</option>
            </ReportSelect>
          </ReportField>
        </>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : mode === "edit" ? t("common.saveChanges") : t("teamTypes.createTeamType")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
