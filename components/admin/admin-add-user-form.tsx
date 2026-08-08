"use client";

import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import { CREATE_USER_ROLE_LABELS, CREATE_USER_ROLE_OPTIONS, DEPARTMENT_OPTIONS, MARKETING_SUB_TEAMS, getSkillsForDepartments } from "@/lib/constants";
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
  department?: string;
  subTeams?: string[];
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
    staleTime: 0
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
      roleTypes: [],
      teamNames: [],
      departments: [],
      managerName: "",
      email: "",
      password: ""
    }
  });

  const selectedRole = useWatch({ control, name: "role" });
  const currentRoleTypes = useWatch({ control, name: "roleTypes" });
  const currentTeamNames = useWatch({ control, name: "teamNames" });
  const currentDepartments = useWatch({ control, name: "departments" }) ?? [];
  const currentManagerName = useWatch({ control, name: "managerName" });
  const teamLeadOptions = managerPools?.teamLeads ?? [];
  const hodOptions = managerPools?.hods ?? [];
  const managerSelectOptions = useMemo(() => {
    if (selectedRole === "hod") return [{ _id: "admin", name: "Admin" }];
    if (selectedRole === "team_lead" || selectedRole === "report_manager") return hodOptions;
    if (selectedRole === "team_member") return teamLeadOptions;
    return teamLeadOptions;
  }, [hodOptions, selectedRole, teamLeadOptions]);

  const availableTeamOptions = useMemo(() => {
    if (selectedRole === "team_member") {
      const selectedManager = teamLeadOptions.find((m) => m.name === currentManagerName);
      if (!selectedManager) return [];
      const managerTeams = normalizeTeamNames(selectedManager.teamName ?? null, selectedManager.teamNames ?? null);
      return teamOptions.filter((team) => managerTeams.includes(team.name));
    }
    return teamOptions;
  }, [selectedRole, teamLeadOptions, currentManagerName, teamOptions]);

  const selectedDepartmentNames = useMemo(
    () => currentDepartments.map((d) => d.name),
    [currentDepartments]
  );
  const availableSkills = useMemo(
    () => getSkillsForDepartments(selectedDepartmentNames),
    [selectedDepartmentNames]
  );

  useEffect(() => {
    if (selectedRole === "report_manager") {
      if (currentRoleTypes?.length) {
        setValue("roleTypes", []);
      }
    } else if (!currentRoleTypes?.length && selectedDepartmentNames.length > 0 && availableSkills.length > 0) {
      setValue("roleTypes", [availableSkills[0].name as any]);
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
  }, [availableSkills, currentManagerName, currentRoleTypes, hodOptions, managerSelectOptions, selectedRole, setValue]);

  useEffect(() => {
    // Clear invalid role types when available skills change
    if (currentRoleTypes && currentRoleTypes.length > 0) {
      const validSkillNames = availableSkills.map((s) => s.name);
      const filteredRoleTypes = currentRoleTypes.filter((rt) => validSkillNames.includes(rt));
      if (filteredRoleTypes.length !== currentRoleTypes.length) {
        setValue("roleTypes", filteredRoleTypes as AdminUserValues["roleTypes"]);
      }
    }
  }, [availableSkills, currentRoleTypes, setValue]);

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

  const toggleDepartment = (deptName: "Construction" | "Software" | "Finance" | "Marketing") => {
    const exists = currentDepartments.some((d) => d.name === deptName);
    let next: typeof currentDepartments;
    if (exists) {
      next = currentDepartments.filter((d) => d.name !== deptName);
    } else {
      next = [...currentDepartments, { name: deptName, subTeams: deptName === "Marketing" ? ["Physical"] : [] }];
    }
    setValue("departments", next);
  };

  const toggleMarketingSubTeam = (sub: "Physical" | "Digital") => {
    const marketingIndex = currentDepartments.findIndex((d) => d.name === "Marketing");
    if (marketingIndex === -1) return;
    const currentSub = currentDepartments[marketingIndex].subTeams ?? [];
    const exists = currentSub.includes(sub);
    const nextSub = exists ? currentSub.filter((s) => s !== sub) : [...currentSub, sub];
    const nextDepartments = [...currentDepartments];
    nextDepartments[marketingIndex] = { name: "Marketing", subTeams: nextSub };
    setValue("departments", nextDepartments);
  };

  const onSubmit = async (values: AdminUserValues) => {
    setError(null);
    setMessage(null);

    const resolvedManagerName = values.managerName;

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
        roleTypes: [],
        teamNames: [],
        departments: [],
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

      <div className="md:col-span-2">
        <Controller
          control={control}
          name="teamNames"
          render={({ field }) => (
            <ReportMultiSelectCards
              label="Team (Team Type)"
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

      <div className="md:col-span-2 space-y-2">
        <div className="text-sm font-medium text-foreground">Departments (Assigned to User)</div>
        <div className="text-xs text-muted-foreground mb-2">Select one or more primary departments for this user.</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DEPARTMENT_OPTIONS.map((deptName) => {
            const isSelected = currentDepartments.some((d) => d.name === deptName);
            return (
              <Button
                key={deptName}
                type="button"
                variant={isSelected ? "default" : "outline"}
                className="justify-start text-xs h-9"
                onClick={() => toggleDepartment(deptName)}
              >
                {deptName}
              </Button>
            );
          })}
        </div>

        {currentDepartments.some((d) => d.name === "Marketing") && (
          <div className="mt-3 p-3 border rounded-lg bg-muted/20 space-y-2">
            <div className="text-xs font-semibold text-foreground">Marketing Sub-Teams</div>
            <div className="flex gap-2">
              {MARKETING_SUB_TEAMS.map((sub) => {
                const marketingDept = currentDepartments.find((d) => d.name === "Marketing");
                const isSubSelected = marketingDept?.subTeams?.includes(sub);
                return (
                  <Button
                    key={sub}
                    type="button"
                    variant={isSubSelected ? "secondary" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => toggleMarketingSubTeam(sub)}
                  >
                    {sub}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
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
                label="Skills / Specialties"
                helperText="Select one or more skills for this user (dynamically filtered based on chosen department)."
                error={errors.roleTypes?.message}
                value={field.value ?? []}
                onChange={field.onChange}
                options={availableSkills.map((skill) => ({
                  value: skill.name,
                  label: skill.name,
                  description: skill.description
                }))}
              />
            )}
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      <Button className="md:col-span-2 w-fit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
