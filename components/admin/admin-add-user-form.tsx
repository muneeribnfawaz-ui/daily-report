"use client";

import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import { CREATE_USER_ROLE_LABELS, CREATE_USER_ROLE_OPTIONS, SOFTWARE_ROLE_DESCRIPTIONS, SOFTWARE_ROLE_OPTIONS } from "@/lib/constants";
import { api } from "@/lib/api";
import { adminCreateUserSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ReportField, ReportInput, ReportMultiSelectCards, ReportSelect } from "@/components/forms/report-controls";
import { PasswordInput } from "@/components/forms/password-input";

type AdminUserValues = z.infer<typeof adminCreateUserSchema>;

type ManagerOption = {
  _id: string;
  name: string;
  teamName?: string | null;
  teamNames?: string[] | null;
};

type ManagerPools = {
  teamLeads: ManagerOption[];
  hods: ManagerOption[];
};

type TeamTypeOption = {
  _id: string;
  name: string;
  showName?: string;
};

function normalizeTeamNames(teamName?: string | null, teamNames?: string[] | null) {
  const values = [teamName, ...(teamNames ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(values));
}

function managerMatchesTeams(manager: ManagerOption | undefined, teamNames: string[]) {
  if (!manager) return false;
  const managerTeams = normalizeTeamNames(manager.teamName ?? null, manager.teamNames ?? null);
  return teamNames.some((teamName) => managerTeams.includes(teamName));
}

export function AdminAddUserForm() {
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
    () => teamTypes ?? [],
    [teamTypes]
  );

  const { data: managerPools } = useQuery<ManagerPools>({
    queryKey: ["admin-report-managers"],
    queryFn: async () => {
      const [teamLeadResponse, hodResponse] = await Promise.all([
        api.get("/api/admin/users", { params: { role: "team_lead" } }),
        api.get("/api/admin/users", { params: { role: "hod" } })
      ]);
      const teamLeads = (teamLeadResponse.data?.data ?? []) as ManagerOption[];
      const hods = (hodResponse.data?.data ?? []) as ManagerOption[];
      return {
        teamLeads,
        hods
      };
    }
  });

  const {
    register,
    control,
    setValue,
    setError: setFieldError,
    clearErrors,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<AdminUserValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      empID: "",
      role: "team_member",
      roleTypes: [SOFTWARE_ROLE_OPTIONS[0]],
      teamNames: [],
      managerName: "",
      email: "",
      password: ""
    }
  });

  const selectedRole = useWatch({ control, name: "role" });
  const currentRoleTypes = useWatch({ control, name: "roleTypes" });
  const currentTeamNames = useWatch({ control, name: "teamNames" });
  const currentManagerName = useWatch({ control, name: "managerName" });
  const teamLeadOptions = managerPools?.teamLeads ?? [];
  const hodOptions = managerPools?.hods ?? [];
  const availableTeamOptions = teamOptions;
  const managerSelectOptions = useMemo(() => {
    if (selectedRole === "hod") return [{ _id: "admin", name: "Admin" }];
    if (selectedRole === "team_lead" || selectedRole === "report_manager") return hodOptions;
    if (selectedRole === "team_member") {
      if (!currentTeamNames.length) return [];
      return teamLeadOptions.filter((manager) => managerMatchesTeams(manager, currentTeamNames));
    }
    return teamLeadOptions;
  }, [currentTeamNames, hodOptions, selectedRole, teamLeadOptions]);

  useEffect(() => {
    if (selectedRole === "report_manager") {
      if (currentRoleTypes?.length) {
        setValue("roleTypes", []);
      }
    } else if (!currentRoleTypes?.length) {
      setValue("roleTypes", [SOFTWARE_ROLE_OPTIONS[0]]);
    }

    if (selectedRole === "hod") {
      if (currentManagerName !== "Admin") {
        setValue("managerName", "Admin");
      }
      return;
    }

    if (selectedRole === "team_lead" || selectedRole === "report_manager") {
      const firstHod = hodOptions[0]?.name ?? "";
      if (firstHod && !hodOptions.some((manager) => manager.name === currentManagerName)) {
        setValue("managerName", firstHod);
      }
      return;
    }

    if (selectedRole === "team_member") {
      const firstValidTeamLead = managerSelectOptions[0]?.name ?? "";
      if (!managerSelectOptions.some((manager) => manager.name === currentManagerName) && firstValidTeamLead) {
        setValue("managerName", firstValidTeamLead);
      }
    }
  }, [currentManagerName, currentRoleTypes, hodOptions, managerSelectOptions, selectedRole, setValue]);

  useEffect(() => {
    if (selectedRole === "team_member") {
      if (!availableTeamOptions.length) {
        if (currentTeamNames?.length) {
          setValue("teamNames", []);
        }
        return;
      }

      const validTeamNames = currentTeamNames?.filter((teamName) => availableTeamOptions.some((team) => team.name === teamName)) ?? [];
      if (!validTeamNames.length) {
        setValue("teamNames", [availableTeamOptions[0].name]);
        return;
      }

      if (validTeamNames.length !== currentTeamNames?.length) {
        setValue("teamNames", validTeamNames);
      }
      return;
    }

    if (!currentTeamNames?.length && availableTeamOptions[0]?.name) {
      setValue("teamNames", [availableTeamOptions[0].name]);
    }
  }, [availableTeamOptions, currentTeamNames, selectedRole, setValue]);

  const onSubmit = async (values: AdminUserValues) => {
    setError(null);
    setMessage(null);

    const resolvedManagerName =
      values.role === "team_member"
        ? managerSelectOptions.find((manager) => manager.name === values.managerName)?.name ?? managerSelectOptions[0]?.name ?? values.managerName
        : values.managerName;

    const parsed = adminCreateUserSchema.safeParse(values);
    if (!parsed.success) {
      clearErrors();
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path.join(".") as keyof AdminUserValues;
        setFieldError(fieldName, {
          type: "manual",
          message: issue.message || "Invalid input"
        });
      });
      return;
    }

    try {
      await api.post("/api/admin/users", {
        ...parsed.data,
        managerName: resolvedManagerName
      });
      reset({
        firstName: "",
        lastName: "",
        phone: "",
        empID: "",
        role: "team_member",
        roleTypes: [SOFTWARE_ROLE_OPTIONS[0]],
        teamNames: [],
        managerName: "",
        email: "",
        password: ""
      });
      setMessage("User created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (requestError) {
      const responseMessage = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
      setError(responseMessage ?? "Failed to create user.");
    }
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <ReportField label="First name" error={errors.firstName?.message}>
        <ReportInput placeholder="First name" {...register("firstName")} />
      </ReportField>
      <ReportField label="Last name" error={errors.lastName?.message}>
        <ReportInput placeholder="Last name" {...register("lastName")} />
      </ReportField>
      <ReportField label="Phone" error={errors.phone?.message}>
        <ReportInput placeholder="Phone" type="tel" {...register("phone")} />
      </ReportField>
      <ReportField label="Employee ID" error={errors.empID?.message}>
        <ReportInput placeholder="Employee ID" {...register("empID")} />
      </ReportField>
      <ReportField label="Email" error={errors.email?.message}>
        <ReportInput placeholder="Email" type="email" {...register("email")} />
      </ReportField>
      <ReportField label="Password" error={errors.password?.message}>
        <PasswordInput variant="report" placeholder="Password" {...register("password")} />
      </ReportField>
      <div className="md:col-span-2">
        <Controller
          control={control}
          name="teamNames"
          render={({ field }) => (
            <ReportMultiSelectCards
              label="Team"
              helperText={
                selectedRole === "team_member"
                  ? "Choose a team managed by the selected team lead."
                  : "Choose one or more teams for this user."
              }
              error={errors.teamNames?.message}
              value={field.value ?? []}
              onChange={field.onChange}
              options={availableTeamOptions.map((team) => ({
                value: team.name,
                label: team.showName ?? team.name
              }))}
            />
          )}
        />
      </div>
      <ReportField label="Role" error={errors.role?.message}>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
              <ReportSelect
                {...field}
                onChange={(event) => {
                  const nextRole = event.target.value as AdminUserValues["role"];
                  field.onChange(nextRole);
                }}
              >
      {CREATE_USER_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {CREATE_USER_ROLE_LABELS[role]}
                </option>
              ))}
            </ReportSelect>
          )}
        />
      </ReportField>
      {selectedRole !== "report_manager" ? (
        <div className="md:col-span-2">
          <Controller
            control={control}
            name="roleTypes"
            render={({ field }) => (
              <ReportMultiSelectCards
                label="Software Type"
                helperText="Choose one or more software specialties for this user."
                error={errors.roleTypes?.message}
                value={field.value ?? []}
                onChange={field.onChange}
                options={SOFTWARE_ROLE_OPTIONS.map((roleType) => ({
                  value: roleType,
                  label: roleType,
                  description: SOFTWARE_ROLE_DESCRIPTIONS[roleType]
                }))}
              />
            )}
          />
        </div>
      ) : null}
      {selectedRole !== "ceo" && selectedRole !== "admin" ? (
        <ReportField className="md:col-span-2" label={selectedRole === "team_member" ? "Team Lead" : "Manager"} error={errors.managerName?.message}>
          <ReportSelect {...register("managerName")}>
            <option value="">{selectedRole === "team_member" ? "Select team lead" : "Select manager"}</option>
            {managerSelectOptions.map((manager) => (
              <option key={manager._id} value={manager.name}>
                {manager.name}
              </option>
            ))}
          </ReportSelect>
        </ReportField>
      ) : null}
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      <Button className="md:col-span-2 w-fit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
