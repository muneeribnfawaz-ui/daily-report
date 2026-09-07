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
      if (!defaultDept && availableDepartments.length === 1) {
        defaultDept = availableDepartments[0];
      }
      if (defaultDept) {
        setValue("department", defaultDept);
      }
    }
  }, [mode, availableDepartments, setValue]);

  useEffect(() => {
    if (mode !== "edit" || !teamTypeId) return;

    let active = true;
    setLoading(true);

    api
      .get(`/api/admin/team-types/${teamTypeId}`)
      .then((response) => {
        if (!active) return;
        const teamType = response.data?.data as TeamTypeRecord;
        setRecord(teamType);
        reset({
          showName: teamType.showName || teamType.name,
          department: teamType.department ?? "",
          subTeams: teamType.subTeams ?? [],
          isActive: teamType.isActive ?? true,
          isDeleted: teamType.isDeleted ?? false
        });
      })
      .catch((requestError) => {
        if (!active) return;
        const responseMessage = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
        setError(responseMessage ?? "Failed to load team type.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mode, reset, teamTypeId]);

  const internalName = useMemo(() => record?.name ?? "Will be generated automatically", [record?.name]);

  const onSubmit = async (values: TeamTypeFormValues) => {
    setMessage(null);
    setError(null);
    clearErrors();

    const parsed = teamTypeFormSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof TeamTypeFormValues;
        if (fieldName) {
          setFieldError(fieldName, {
            type: "manual",
            message: issue.message || "Invalid input"
          });
        }
      });
      return;
    }

    const payload = {
      ...parsed.data,
      isActive: mode === "create" ? true : parsed.data.isActive,
      department: parsed.data.department ? parsed.data.department : undefined,
      subTeams: parsed.data.department === "Marketing" ? parsed.data.subTeams : []
    };

    try {
      if (mode === "edit" && teamTypeId) {
        await api.patch(`/api/admin/team-types/${teamTypeId}`, payload);
        setMessage("Team type updated successfully.");
      } else {
        await api.post("/api/admin/team-types", payload);
        setMessage("Team type created successfully.");
        reset(emptyValues);
      }

      onSaved?.();
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const data = requestError.response?.data;
        let msg: string | null = null;
        if (typeof data?.message === "string") {
          msg = data.message;
        } else if (Array.isArray(data) && data[0]?.message) {
          msg = data[0].message;
        }
        setError(msg ?? "Failed to save team type.");
      } else {
        setError("Failed to save team type.");
      }
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading team type...</div>;
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <ReportField label="Department" required error={errors.department?.message}>
        <ReportSelect
          {...register("department", {
            onChange: (e) => {
              if (e.target.value !== "Marketing") {
                setValue("subTeams", []);
              }
            }
          })}
        >
          <option value="">Select Department</option>
          {availableDepartments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </ReportSelect>
      </ReportField>

      <ReportField label="Team Name" required error={errors.showName?.message}>
        <ReportInput placeholder="e.g. Finance Team, Frontend, QA" {...register("showName")} />
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
          <ReportField label="Status" error={errors.isActive?.message}>
            <ReportSelect {...register("isActive", { setValueAs: (value) => String(value) === "true" })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
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
          {isSubmitting ? "Saving..." : mode === "edit" ? "Update Team Type" : "Create Team Type"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

