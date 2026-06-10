"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ReportField, ReportInput, ReportSelect } from "@/components/forms/report-controls";
import { api } from "@/lib/api";

const teamTypeFormSchema = z.object({
  showName: z.string().min(2, "Enter display name"),
  isActive: z.boolean(),
  isDeleted: z.boolean()
});

type TeamTypeFormValues = z.infer<typeof teamTypeFormSchema>;

type TeamTypeRecord = TeamTypeFormValues & {
  _id: string;
  name: string;
  createdAt?: string;
  createdBy?: string;
};

const emptyValues: TeamTypeFormValues = {
  showName: "",
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<TeamTypeFormValues>({
    resolver: zodResolver(teamTypeFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: emptyValues
  });

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
          showName: teamType.showName,
          isActive: teamType.isActive,
          isDeleted: teamType.isDeleted
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

    try {
      if (mode === "edit" && teamTypeId) {
        await api.patch(`/api/admin/team-types/${teamTypeId}`, values);
        setMessage("Team type updated successfully.");
      } else {
        await api.post("/api/admin/team-types", values);
        setMessage("Team type created successfully.");
        reset(emptyValues);
      }

      onSaved?.();
    } catch (requestError) {
      const responseMessage = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
      setError(responseMessage ?? "Failed to save team type.");
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading team type...</div>;
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <ReportField label="Show name" error={errors.showName?.message}>
        <ReportInput placeholder="Show name" {...register("showName")} />
      </ReportField>
      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        Internal name: {internalName}
      </div>
      <ReportField label="Status" error={errors.isActive?.message}>
        <ReportSelect {...register("isActive", { setValueAs: (value) => value === "true" })}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </ReportSelect>
      </ReportField>
      <ReportField label="Deleted" error={errors.isDeleted?.message}>
        <ReportSelect {...register("isDeleted", { setValueAs: (value) => value === "true" })}>
          <option value="false">Not deleted</option>
          <option value="true">Deleted</option>
        </ReportSelect>
      </ReportField>

      {mode === "edit" && record ? (
        <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
          <div>Created by: {record.createdBy || "N/A"}</div>
          <div>Created at: {record.createdAt ? new Date(record.createdAt).toLocaleString() : "N/A"}</div>
        </div>
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
