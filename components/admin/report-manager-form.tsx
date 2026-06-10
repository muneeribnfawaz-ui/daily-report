"use client";

import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { TEAM_OPTIONS } from "@/lib/constants";
import { api } from "@/lib/api";
import { adminCreateReportManagerSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ReportField, ReportInput, ReportSelect } from "@/components/forms/report-controls";
import { PasswordInput } from "@/components/forms/password-input";

type ReportManagerValues = z.infer<typeof adminCreateReportManagerSchema>;
type TeamTypeOption = {
  _id: string;
  name: string;
  showName?: string;
};

export function AdminReportManagerForm() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: teamTypes } = useQuery<TeamTypeOption[]>({
    queryKey: ["team-types"],
    queryFn: async () => {
      const response = await api.get("/api/team-types");
      return response.data?.data as TeamTypeOption[];
    },
    staleTime: 60_000
  });
  const teamOptions = useMemo(
    () => (teamTypes?.length ? teamTypes : TEAM_OPTIONS.map((team) => ({ _id: team, name: team, showName: team }))),
    [teamTypes]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ReportManagerValues>({
    resolver: zodResolver(adminCreateReportManagerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      teamName: teamOptions[0]?.name ?? TEAM_OPTIONS[0]
    }
  });

  const selectedTeam = watch("teamName");

  useEffect(() => {
    if (!teamOptions.length) return;
    if (!teamOptions.some((team) => team.name === selectedTeam)) {
      setValue("teamName", teamOptions[0].name);
    }
  }, [selectedTeam, setValue, teamOptions]);

  const onSubmit = async (values: ReportManagerValues) => {
    setError(null);
    setMessage(null);

    try {
      await api.post("/api/admin/users", values);
      reset({
        name: "",
        email: "",
        password: "",
        teamName: teamOptions[0]?.name ?? TEAM_OPTIONS[0]
      });
      setMessage("Report manager created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (requestError) {
      const responseMessage = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
      setError(responseMessage ?? "Failed to create report manager.");
    }
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <ReportField label="Full name" error={errors.name?.message}>
        <ReportInput placeholder="Full name" {...register("name")} />
      </ReportField>
      <ReportField label="Email" error={errors.email?.message}>
        <ReportInput placeholder="Email" type="email" {...register("email")} />
      </ReportField>
      <ReportField label="Password" error={errors.password?.message}>
        <PasswordInput variant="report" placeholder="Password" {...register("password")} />
      </ReportField>
      <ReportField label="Team" error={errors.teamName?.message}>
        <ReportSelect {...register("teamName")}>
          {teamOptions.map((team) => (
            <option key={team._id} value={team.name}>
              {team.showName ?? team.name}
            </option>
          ))}
        </ReportSelect>
      </ReportField>
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      <Button className="md:col-span-2 w-fit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Report Manager"}
      </Button>
    </form>
  );
}
