"use client";

import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import {
  CREATE_USER_ROLE_LABELS,
  DEPARTMENT_OPTIONS,
  MARKETING_SUB_TEAMS,
  getSkillsForDepartments,
  ROLE_LABELS
} from "@/lib/constants";
import { api } from "@/lib/api";
import { adminCreateUserSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportField, ReportInput, ReportMultiSelectCards, ReportSelect } from "@/components/forms/report-controls";
import { PasswordInput } from "@/components/forms/password-input";
import type { SessionUser } from "@/lib/types";

type CreateUserValues = z.infer<typeof adminCreateUserSchema>;

type TeamTypeOption = {
  _id: string;
  name: string;
  showName?: string;
};

type ManagerOption = {
  _id: string;
  name: string;
  teamName?: string | null;
  teamNames?: string[] | null;
};

const HOD_ROLE_OPTIONS = ["team_lead", "report_manager", "team_member"] as const;

function normalizeTeamNames(teamName?: string | null, teamNames?: string[] | null) {
  const values = [teamName, ...(teamNames ?? [])]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(values));
}

function sameStringList(left?: string[] | null, right?: string[] | null) {
  if (left === right) return true;
  if (!left || !right) return !left?.length && !right?.length;
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function managerMatchesTeams(manager: ManagerOption | undefined, teamNames: string[]) {
  if (!manager) return false;
  const managerTeams = normalizeTeamNames(manager.teamName ?? null, manager.teamNames ?? null);
  return teamNames.some((teamName) => managerTeams.includes(teamName));
}

export function ManagerAddUserForm() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const teamLeadDefaultsAppliedRef = useRef(false);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });

  const { data: teamTypes } = useQuery<TeamTypeOption[]>({
    queryKey: ["team-types"],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get("/api/team-types");
      return response.data?.data as TeamTypeOption[];
    },
    staleTime: 0
  });

  const { data: teamLeadOptions = [] } = useQuery<ManagerOption[]>({
    queryKey: ["team-leads-for-create", currentUser?.role, currentUser?.name],
    enabled: currentUser?.role === "hod",
    queryFn: async () => {
      const response = await api.get("/api/report-manager/users", { params: { role: "team_lead" } });
      return response.data?.data as ManagerOption[];
    },
    staleTime: 60_000
  });

  const teamOptions = useMemo(() => teamTypes ?? [], [teamTypes]);
  const isTeamLead = currentUser?.role === "team_lead";
  const isHod = currentUser?.role === "hod";
  const roleOptions = isTeamLead ? ["team_member"] : HOD_ROLE_OPTIONS;
  const currentUserTeamNames = useMemo(
    () => normalizeTeamNames(currentUser?.teamName ?? null, currentUser?.teamNames ?? null),
    [currentUser?.teamName, currentUser?.teamNames]
  );

  const {
    register,
    control,
    setValue,
    setError: setFieldError,
    clearErrors,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateUserValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      empID: "",
      role: isTeamLead ? "team_member" : "team_member",
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

  const selectedDepartmentNames = useMemo(
    () => currentDepartments.map((d) => d.name),
    [currentDepartments]
  );
  const availableSkills = useMemo(
    () => getSkillsForDepartments(selectedDepartmentNames),
    [selectedDepartmentNames]
  );

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

  const selectedTeamLead = useMemo(
    () => teamLeadOptions.find((manager) => manager.name === currentManagerName) ?? null,
    [currentManagerName, teamLeadOptions]
  );
  const selectedLeadTeamNames = useMemo(
    () => normalizeTeamNames(selectedTeamLead?.teamName ?? null, selectedTeamLead?.teamNames ?? null),
    [selectedTeamLead]
  );
  const availableTeamOptions = useMemo(() => {
    if (isTeamLead) {
      if (!currentUserTeamNames.length) return teamOptions;
      return teamOptions.filter((team) => currentUserTeamNames.includes(team.name));
    }

    return teamOptions;
  }, [currentUserTeamNames, isTeamLead, teamOptions]);

  const managerSelectOptions = useMemo(() => {
    if (isTeamLead) return [];
    if (selectedRole === "team_member") {
      if (!currentTeamNames.length) return [];
      return teamLeadOptions.filter((manager) => managerMatchesTeams(manager, currentTeamNames));
    }
    return teamLeadOptions;
  }, [currentTeamNames, isTeamLead, selectedRole, teamLeadOptions]);

  useEffect(() => {
    if (!currentUser || !isTeamLead || teamLeadDefaultsAppliedRef.current) return;

    if (!teamOptions.length) return;

    const nextTeamNames = currentUserTeamNames.length ? currentUserTeamNames : teamOptions.map((team) => team.name);

    if (currentManagerName !== currentUser.name) {
      setValue("managerName", currentUser.name);
    }
    if (selectedRole !== "team_member") {
      setValue("role", "team_member");
    }
    if (!sameStringList(currentTeamNames, nextTeamNames)) {
      setValue("teamNames", nextTeamNames);
    }

    teamLeadDefaultsAppliedRef.current = true;
  }, [currentManagerName, currentTeamNames, currentUser, currentUserTeamNames, isTeamLead, selectedRole, setValue, teamOptions]);

  useEffect(() => {
    if (isTeamLead) return;
    if (!currentUser) return;

    if (selectedRole === "team_member") {
      const firstValidTeamLead = managerSelectOptions[0]?.name ?? "";
      if (!managerSelectOptions.some((manager) => manager.name === currentManagerName) && firstValidTeamLead) {
        setValue("managerName", firstValidTeamLead);
      }
    } else {
      if (currentManagerName !== currentUser.name) {
        setValue("managerName", currentUser.name);
      }
    }
  }, [currentManagerName, currentUser, isTeamLead, managerSelectOptions, selectedRole, setValue]);

  useEffect(() => {
    if (selectedRole === "report_manager") {
      if (currentRoleTypes?.length) {
        setValue("roleTypes", []);
      }
    } else if (!currentRoleTypes?.length && selectedDepartmentNames.length > 0 && availableSkills.length > 0) {
      setValue("roleTypes", [availableSkills[0].name as any]);
    }

    if (isTeamLead) {
      if (!availableTeamOptions.length) {
        if (currentTeamNames?.length) {
          setValue("teamNames", []);
        }
        return;
      }

      const validTeamNames = currentTeamNames?.filter((teamName) => availableTeamOptions.some((team) => team.name === teamName)) ?? [];
      if (!validTeamNames.length) {
        setValue("teamNames", [availableTeamOptions[0].name]);
      } else if (!sameStringList(validTeamNames, currentTeamNames)) {
        setValue("teamNames", validTeamNames);
      }
      return;
    }

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
      } else if (!sameStringList(validTeamNames, currentTeamNames)) {
        setValue("teamNames", validTeamNames);
      }
      return;
    }

    if (!currentTeamNames?.length && availableTeamOptions[0]?.name) {
      setValue("teamNames", [availableTeamOptions[0].name]);
    }
  }, [availableTeamOptions, currentRoleTypes, currentTeamNames, isTeamLead, selectedRole, setValue]);

  const onSubmit = async (values: CreateUserValues) => {
    setError(null);
    setMessage(null);

    const resolvedTeamNames =
      isTeamLead
        ? currentUserTeamNames.length
          ? values.teamNames.filter((teamName) => currentUserTeamNames.includes(teamName))
          : values.teamNames
        : values.teamNames;

    const payload: CreateUserValues = {
      ...values,
      managerName: isTeamLead ? currentUser?.name ?? values.managerName : values.managerName,
      teamNames: resolvedTeamNames
    };

    const parsed = adminCreateUserSchema.safeParse(payload);
    if (!parsed.success) {
      clearErrors();
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path.join(".") as keyof CreateUserValues;
        setFieldError(fieldName, {
          type: "manual",
          message: issue.message || "Invalid input"
        });
      });
      return;
    }

    try {
      await api.post("/api/report-manager/users", parsed.data);
      reset({
        firstName: "",
        lastName: "",
        phone: "",
        empID: "",
        role: isTeamLead ? "team_member" : "team_member",
        roleTypes: [],
        teamNames: isTeamLead && currentUserTeamNames.length ? currentUserTeamNames : [],
        managerName: currentUser?.name ?? "",
        email: "",
        password: ""
      });
      setMessage("User created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["/api/report-manager/users"] });
    } catch (requestError) {
      const responseMessage = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
      setError(responseMessage ?? "Failed to create user.");
    }
  };

  if (!currentUser) {
    return <div className="text-sm text-muted-foreground">Loading user session...</div>;
  }

  if (!isTeamLead && !isHod) {
    return (
      <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
        Only team leads and HODs can create users here.
      </div>
    );
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
      <div className="md:col-span-2 rounded-2xl border bg-background/70 p-4">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Creating as</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="soft">{currentUser.name}</Badge>
          <Badge variant="outline">{ROLE_LABELS[currentUser.role as keyof typeof ROLE_LABELS] ?? currentUser.role}</Badge>
          {currentUserTeamNames.map((teamName) => (
            <Badge key={teamName} variant="outline">
              {teamName}
            </Badge>
          ))}
        </div>
      </div>

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

      {!isTeamLead ? (
        <ReportField label="Role" error={errors.role?.message}>
          <ReportSelect {...register("role")}>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role === "team_member" ? "Team Member" : CREATE_USER_ROLE_LABELS[role as keyof typeof CREATE_USER_ROLE_LABELS]}
              </option>
            ))}
          </ReportSelect>
        </ReportField>
      ) : (
        <div className="md:col-span-2 rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          Role is fixed to Team Member for team lead-created users.
        </div>
      )}

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

      {isTeamLead ? (
        <div className="md:col-span-2">
          <Controller
            control={control}
            name="teamNames"
            render={({ field }) => (
              <ReportMultiSelectCards
                label="Team"
                helperText="Choose one or more teams from your assigned team list."
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
      ) : (
        <>
          {selectedRole === "team_member" ? (
            <ReportField className="md:col-span-2" label="Team Lead" error={errors.managerName?.message}>
              <ReportSelect {...register("managerName")}>
                <option value="">Select team lead</option>
                {managerSelectOptions.map((manager) => (
                  <option key={manager._id} value={manager.name}>
                    {manager.name}
                  </option>
                ))}
              </ReportSelect>
            </ReportField>
          ) : (
            <input type="hidden" {...register("managerName")} />
          )}

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
        </>
      )}

      {isTeamLead ? null : selectedRole === "team_member" ? null : (
        <div className="md:col-span-2 rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          Manager is set automatically to {currentUser.name}.
        </div>
      )}

      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}

      <Button className="md:col-span-2 w-fit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
