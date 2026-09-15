"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import {
  CREATE_USER_ROLE_LABELS,
  CREATE_USER_ROLE_OPTIONS,
  DEPARTMENT_OPTIONS,
  MARKETING_SUB_TEAMS,
  ROLE_LABELS,
  getSkillsForDepartments,
  normalizeRole
} from "@/lib/constants";
import { api } from "@/lib/api";
import { adminUpdateUserSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ReportField, ReportInput, ReportMultiSelectCards, ReportSelect } from "@/components/forms/report-controls";
import { PasswordInput } from "@/components/forms/password-input";
import { PhoneInput } from "@/components/forms/phone-input";
import { useSession } from "@/hooks/use-session";
import { canUpdateEmail } from "@/lib/permissions";
import { useTranslation } from "@/lib/i18n";
import { normalizeSkillKey } from "@/lib/skills-i18n";

type UpdateUserValues = z.infer<typeof adminUpdateUserSchema>;

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

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  workspaceId?: string;
  teamName?: string | null;
  teamNames?: string[] | null;
  departments?: Array<{ name: string; subTeams: string[] }> | null;
};

type DepartmentItem = {
  name: "Construction" | "Software" | "Finance" | "Marketing";
  subTeams?: string[];
};

type CompanyOption = {
  _id: string;
  name: string;
};

type UserRecord = {
  _id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  empID?: string;
  email?: string;
  role?: string;
  roleTypes?: string[];
  workspaceId?: string;
  teamName?: string;
  teamNames?: string[];
  departments?: DepartmentItem[];
  managerName?: string;
  status?: "active" | "inactive" | "suspended";
  isActive?: boolean;
  isDeleted?: boolean;
  isAdminActive?: boolean;
  isEmailActivated?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeUserTeamNames(userData: UserRecord | null | undefined) {
  if (!userData) return [];
  if (userData.teamNames?.length) return userData.teamNames;
  if (userData.teamName) return [userData.teamName];
  return [];
}

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

export function UserEditForm({ userId, backHref = "/admin/users" }: { userId: string; backHref?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, isRtl } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: companies } = useQuery<CompanyOption[]>({
    queryKey: ["header-active-companies"],
    queryFn: async () => {
      const response = await api.get("/api/companies");
      return response.data?.data as CompanyOption[];
    }
  });

  const { data: sessionUser } = useQuery<SessionUser | null>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return (response.data?.data ?? null) as SessionUser | null;
    }
  });

  const { data: userData, isLoading, isError } = useQuery<UserRecord>({
    queryKey: ["user-edit", userId],
    queryFn: async () => {
      const response = await api.get(`/api/users/${userId}`);
      return response.data?.data as UserRecord;
    }
  });

  const activeWorkspaceId = userData?.workspaceId || sessionUser?.workspaceId;

  const { data: teamTypes } = useQuery<TeamTypeOption[]>({
    queryKey: ["team-types", "edit-user", activeWorkspaceId],
    queryFn: async () => {
      const params: Record<string, string> = { includeInactive: "true", department: "all" };
      if (activeWorkspaceId) {
        params.workspaceId = activeWorkspaceId;
      }
      const response = await api.get("/api/admin/team-types", { params });
      return (response.data?.data ?? []) as TeamTypeOption[];
    },
    staleTime: 0
  });
  const teamOptions = useMemo(
    () => teamTypes ?? [],
    [teamTypes]
  );

  const sessionUserRole = sessionUser?.role;
  const sessionUserName = sessionUser?.name;
  const currentRole = normalizeRole(sessionUser?.role) ?? null;
  const currentUserTeamNames = useMemo(
    () => normalizeTeamNames(sessionUser?.teamName ?? null, sessionUser?.teamNames ?? null),
    [sessionUser?.teamName, sessionUser?.teamNames]
  );
  const isTeamLead = currentRole === "team_lead";
  const canEditManagerName = (currentRole === "admin" || currentRole === "hod" || currentRole === "ceo") && !isTeamLead;
  const canEditRole = (currentRole === "admin" || ((currentRole === "hod" || currentRole === "ceo") && userData?.role !== "ceo")) && !isTeamLead;
  const canEditWorkspace = currentRole === "admin" && userData?.role !== "ceo";
  const canEditEmpID = currentRole === "admin" || currentRole === "ceo" || currentRole === "hod";
  const canEditEmail = canUpdateEmail(sessionUserRole || "", userData?.role || "", false);
  const canResetPassword = currentRole === "admin" || currentRole === "ceo" || currentRole === "hod";

  const availableRoleOptions = useMemo(() => {
    if (sessionUser?.role !== "admin") {
      return CREATE_USER_ROLE_OPTIONS.filter((role) => role !== "ceo");
    }
    return CREATE_USER_ROLE_OPTIONS;
  }, [sessionUser?.role]);

  const allowedDepartments = useMemo(() => {
    if ((currentRole === "hod" || currentRole === "team_lead" || currentRole === "report_manager") && sessionUser?.departments && sessionUser.departments.length > 0) {
      return sessionUser.departments.map((d) => d.name);
    }
    if ((currentRole === "hod" || currentRole === "team_lead" || currentRole === "report_manager") && sessionUser?.teamNames && sessionUser.teamNames.length > 0 && teamTypes) {
      const depts = new Set<string>();
      sessionUser.teamNames.forEach((tn: string) => {
        const teamInfo = teamTypes.find((t) => t.name === tn);
        if (teamInfo?.department) depts.add(teamInfo.department);
      });
      if (depts.size > 0) return Array.from(depts);
    }
    if (currentRole === "hod" || currentRole === "team_lead" || currentRole === "report_manager") {
      return [];
    }
    return DEPARTMENT_OPTIONS;
  }, [currentRole, sessionUser?.departments, sessionUser?.teamNames, teamTypes]);

  const {
    register,
    control,
    setValue,
    setError: setFieldError,
    clearErrors,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<UpdateUserValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      empID: "",
      role: undefined,
      roleTypes: [],
      workspaceId: "",
      teamNames: [],
      departments: [],
      managerName: "",
      email: "",
      resetPassword: false,
      newPassword: "",
      confirmPassword: "",
      status: "active",
      isActive: true,
      isDeleted: false,
      isAdminActive: false,
      isEmailActivated: false
    }
  });

  useEffect(() => {
    if (!userData) return;
    const existingTeams = normalizeUserTeamNames(userData);
    const resolvedTeamNames =
      existingTeams.length > 0
        ? existingTeams
        : isTeamLead && currentUserTeamNames.length > 0
        ? currentUserTeamNames
        : [];

    reset({
      firstName: userData.firstName ?? "",
      lastName: userData.lastName ?? "",
      phone: userData.phone ?? "",
      empID: userData.empID ?? "",
      role: normalizeRole(userData.role) ?? undefined,
      roleTypes: (userData.roleTypes ?? []) as UpdateUserValues["roleTypes"],
      workspaceId: userData.workspaceId ?? "",
      teamNames: resolvedTeamNames as UpdateUserValues["teamNames"],
      departments: (userData.departments ?? []) as UpdateUserValues["departments"],
      managerName: isTeamLead ? (sessionUserName || userData.managerName || "") : (userData.managerName ?? ""),
      email: userData.email ?? "",
      resetPassword: false,
      newPassword: "",
      confirmPassword: "",
      status: userData.status ?? "active",
      isActive: userData.isActive ?? true,
      isDeleted: userData.isDeleted ?? false,
      isAdminActive: userData.isAdminActive ?? false,
      isEmailActivated: userData.isEmailActivated ?? false
    });
  }, [currentUserTeamNames, isTeamLead, reset, sessionUserName, userData]);

  const managerName = useWatch({ control, name: "managerName" });
  const selectedRole = useWatch({ control, name: "role" });

  const { data: managerPools } = useQuery<ManagerPools>({
    queryKey: ["user-edit-manager-pools"],
    enabled: canEditManagerName,
    queryFn: async () => {
      const [teamLeadResponse, hodResponse] = await Promise.all([
        api.get("/api/admin/users", { params: { role: "team_lead" } }),
        api.get("/api/admin/users", { params: { role: "hod" } })
      ]);
      return {
        teamLeads: (teamLeadResponse.data?.data ?? []) as ManagerOption[],
        hods: (hodResponse.data?.data ?? []) as ManagerOption[]
      };
    }
  });

  const currentRoleTypes = useWatch({ control, name: "roleTypes" });
  const currentTeamNames = useWatch({ control, name: "teamNames" });
  const currentDepartments = useWatch({ control, name: "departments" }) ?? [];
  const resetPasswordEnabled = useWatch({ control, name: "resetPassword" });

  const teamLeadOptions = managerPools?.teamLeads ?? [];
  const hodOptions = managerPools?.hods ?? [];

  const selectedDepartmentNames = useMemo(
    () => currentDepartments.map((d) => d.name),
    [currentDepartments]
  );

  const availableSkills = useMemo(
    () => getSkillsForDepartments(selectedDepartmentNames),
    [selectedDepartmentNames]
  );

  const managerSelectOptions = useMemo(() => {
    if (!canEditManagerName) return [];
    if (selectedRole === "hod") return [{ _id: "admin", name: t("roles.admin") }];

    let baseOptions = (selectedRole === "team_lead" || selectedRole === "report_manager") ? hodOptions : teamLeadOptions;
    if (userData?.managerName && !baseOptions.some((m) => m.name === userData.managerName)) {
      baseOptions = [{ _id: "current_manager", name: userData.managerName }, ...baseOptions];
    }
    return baseOptions;
  }, [canEditManagerName, hodOptions, selectedRole, teamLeadOptions, userData?.managerName]);

  const availableTeamOptions = useMemo(() => {
    if (selectedRole === "ceo" || selectedRole === "hod" || selectedRole === "report_manager") {
      return [];
    }

    let teams = teamOptions;
    if (isTeamLead) {
      const allowedTeamNames = sessionUser?.teamNames ?? [];
      const allowedTeamName = sessionUser?.teamName;
      const allAllowed = [...allowedTeamNames];
      if (allowedTeamName && !allAllowed.includes(allowedTeamName)) {
        allAllowed.push(allowedTeamName);
      }
      const existingTeams = normalizeUserTeamNames(userData);
      for (const et of existingTeams) {
        if (!allAllowed.some((a) => a.trim().toLowerCase() === et.trim().toLowerCase())) {
          allAllowed.push(et);
        }
      }
      if (allAllowed.length) {
        const normalizedAllowed = allAllowed.map((t) => t.trim().toLowerCase());
        const filtered = teamOptions.filter(
          (team) =>
            normalizedAllowed.includes(team.name.trim().toLowerCase()) ||
            (team.showName && normalizedAllowed.includes(team.showName.trim().toLowerCase()))
        );
        const coveredNames = new Set(
          filtered.flatMap((t) => [t.name.toLowerCase(), (t.showName || "").toLowerCase()].filter(Boolean))
        );
        const missing = allAllowed.filter((a) => !coveredNames.has(a.toLowerCase()));
        teams = [
          ...filtered,
          ...missing.map((name) => ({
            _id: name,
            name: name,
            showName: name
          }))
        ];
      }
    } else if (selectedRole === "team_member") {
      if (managerName) {
        const selectedManager = managerSelectOptions.find((m) => m.name === managerName);
        const managerTeams = normalizeTeamNames(selectedManager?.teamName ?? null, selectedManager?.teamNames ?? null);
        const existingTeams = normalizeUserTeamNames(userData);
        const allowedTeams = Array.from(new Set([...managerTeams, ...existingTeams]));

        if (allowedTeams.length > 0) {
          const normalizedAllowed = allowedTeams.map((t) => t.trim().toLowerCase());
          const filtered = teamOptions.filter(
            (team) =>
              normalizedAllowed.includes(team.name.trim().toLowerCase()) ||
              (team.showName && normalizedAllowed.includes(team.showName.trim().toLowerCase()))
          );
          if (filtered.length > 0) return filtered;
          return allowedTeams.map((name) => ({
            _id: name,
            name: name,
            showName: name
          }));
        }
      } else {
        const existingTeams = normalizeUserTeamNames(userData);
        if (existingTeams.length > 0) {
          const normalizedAllowed = existingTeams.map((t) => t.trim().toLowerCase());
          const filtered = teamOptions.filter(
            (team) =>
              normalizedAllowed.includes(team.name.trim().toLowerCase()) ||
              (team.showName && normalizedAllowed.includes(team.showName.trim().toLowerCase()))
          );
          if (filtered.length > 0) return filtered;
          return existingTeams.map((name) => ({
            _id: name,
            name: name,
            showName: name
          }));
        }
        return [];
      }
    } else if (selectedDepartmentNames.length > 0) {
      const deptTeams = teams.filter((team) => {
        if (!team.department) return false;
        return selectedDepartmentNames.some(
          (sd) => sd.trim().toLowerCase() === team.department?.trim().toLowerCase()
        );
      });
      if (deptTeams.length > 0) {
        teams = deptTeams;
      } else {
        teams = [];
      }
    }
    return teams;
  }, [isTeamLead, managerName, managerSelectOptions, selectedDepartmentNames, selectedRole, sessionUser?.teamName, sessionUser?.teamNames, teamOptions, userData]);

  const teamTypeEmptyMessage = useMemo(() => {
    if (isTeamLead) {
      return "No team types assigned to your account.";
    }
    if (selectedRole === "team_member") {
      if (!managerName) {
        return "Select a manager first to view available team types.";
      }
      return "No team types available for the selected manager.";
    }
    if (selectedRole === "team_lead") {
      return "No team types available for the selected department.";
    }
    return "No team types available.";
  }, [isTeamLead, selectedRole, managerName]);

  const teamTypeHelperText = useMemo(() => {
    if (isTeamLead) {
      return "Choose one or more team types from your assigned team list.";
    }
    if (selectedRole === "team_member") {
      return managerName
        ? "Choose at least one team type managed by the selected team lead."
        : "Select a manager above to choose from their managed team types.";
    }
    if (selectedRole === "team_lead") {
      return "Choose at least one team type for this team lead.";
    }
    return "Choose one or more team types for this user.";
  }, [isTeamLead, selectedRole, managerName]);

  useEffect(() => {
    if (!selectedRole) return;
    if (selectedRole === "report_manager" || selectedRole === "ceo" || selectedRole === "hod") {
      if (currentRoleTypes && currentRoleTypes.length > 0) {
        setValue("roleTypes", []);
      }
      if (currentTeamNames && currentTeamNames.length > 0) {
        setValue("teamNames", []);
      }
      if (selectedRole === "ceo" && currentDepartments.length > 0) {
        setValue("departments", []);
      }
      if (selectedRole === "hod") {
        const ceoManager = sessionUserRole === "ceo" ? (sessionUserName || "CEO") : "CEO";
        if (managerName !== ceoManager) {
          setValue("managerName", ceoManager);
        }
      }
    }
  }, [
    selectedRole,
    sessionUserRole,
    sessionUserName,
    currentRoleTypes?.length,
    currentTeamNames?.length,
    currentDepartments.length,
    managerName,
    setValue
  ]);

  const toggleDepartment = (deptName: "Construction" | "Software" | "Finance" | "Marketing") => {
    const exists = currentDepartments.some((d) => d.name === deptName);
    let next: typeof currentDepartments;
    if (exists) {
      next = currentDepartments.filter((d) => d.name !== deptName);
    } else {
      next = [...currentDepartments, { name: deptName, subTeams: deptName === "Marketing" ? ["Physical"] : [] }];
    }
    setValue("departments", next, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (next.length > 0) {
      clearErrors("departments");
    }
  };

  const toggleMarketingSubTeam = (sub: "Physical" | "Digital") => {
    const marketingIndex = currentDepartments.findIndex((d) => d.name === "Marketing");
    if (marketingIndex === -1) return;
    const currentSub = currentDepartments[marketingIndex].subTeams ?? [];
    const exists = currentSub.includes(sub);
    const nextSub = exists ? currentSub.filter((s) => s !== sub) : [...currentSub, sub];
    const nextDepartments = [...currentDepartments];
    nextDepartments[marketingIndex] = { name: "Marketing", subTeams: nextSub };
    setValue("departments", nextDepartments, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    clearErrors("departments");
  };

  const onSubmit = async (values: UpdateUserValues) => {
    setError(null);
    setMessage(null);

    const normalizedTeamNames = Array.from(
      new Set((values.teamNames ?? []).map((teamName) => teamName.trim()).filter(Boolean))
    );
    const resolvedManagerName = isTeamLead ? (sessionUserName || values.managerName) : values.managerName;

    const payload = {
      ...values,
      email: canEditEmail ? values.email : undefined,
      teamNames: normalizedTeamNames,
      managerName: canEditManagerName ? resolvedManagerName : isTeamLead ? resolvedManagerName : undefined,
      resetPassword: canResetPassword ? values.resetPassword : undefined,
      newPassword: values.resetPassword ? values.newPassword : undefined,
      confirmPassword: values.resetPassword ? values.confirmPassword : undefined
    };

    const parsed = adminUpdateUserSchema.safeParse(payload);
    if (!parsed.success) {
      clearErrors();
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path.join(".") as keyof UpdateUserValues;
        setFieldError(fieldName, {
          type: "manual",
          message: issue.message || "Invalid input"
        });
      });
      return;
    }

    try {
      const response = await api.patch(`/api/users/${userId}`, parsed.data);
      const updatedUser = response.data?.data as UserRecord | undefined;
      if (updatedUser) {
        reset({
          firstName: updatedUser.firstName ?? "",
          lastName: updatedUser.lastName ?? "",
          phone: updatedUser.phone ?? "",
          empID: updatedUser.empID ?? "",
          role: normalizeRole(updatedUser.role) ?? undefined,
          roleTypes: (updatedUser.roleTypes ?? []) as UpdateUserValues["roleTypes"],
          workspaceId: updatedUser.workspaceId ?? "",
          teamNames: normalizeUserTeamNames(updatedUser) as UpdateUserValues["teamNames"],
          managerName: updatedUser.managerName ?? "",
          email: updatedUser.email ?? "",
          resetPassword: false,
          newPassword: "",
          confirmPassword: "",
          status: updatedUser.status ?? "active",
          isActive: updatedUser.isActive ?? true,
          isDeleted: updatedUser.isDeleted ?? false,
          isAdminActive: updatedUser.isAdminActive ?? false,
          isEmailActivated: updatedUser.isEmailActivated ?? false
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["user-edit", userId] });
      await queryClient.invalidateQueries({ queryKey: ["report-manager-users"] });
      setMessage(t("users.userUpdated"));
      setTimeout(() => {
        router.push(backHref as any);
      }, 500);
    } catch (requestError) {
      const errorData = axios.isAxiosError(requestError) ? requestError.response?.data : null;
      const responseMessage = errorData?.message ?? (axios.isAxiosError(requestError) ? requestError.message : null);
      if (errorData?.statusCode === 2004 || responseMessage?.toLowerCase().includes("employee id")) {
        setFieldError("empID", {
          type: "server",
          message: responseMessage || t("users.employeeIdExists")
        });
      }
      setError(responseMessage ?? t("common.somethingWentWrong"));
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (isError || !userData) {
    return <div className="text-sm text-danger">{t("common.error")}</div>;
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
      {/* 1. Company */}
      {currentRole === "hod" || currentRole === "team_lead" || currentRole === "report_manager" || currentRole === "ceo" ? (
        <ReportField className="md:col-span-2" label={t("common.company")}>
          <input type="hidden" {...register("workspaceId")} />
          <ReportInput
            disabled
            value={companies?.find((c) => c._id === (userData?.workspaceId || sessionUser?.workspaceId))?.name || t("common.company")}
            className="font-semibold text-sky-600 dark:text-sky-400"
          />
        </ReportField>
      ) : (
        <ReportField className="md:col-span-2" label={t("common.company")} required error={errors.workspaceId?.message}>
          <ReportSelect {...register("workspaceId")}>
            <option value="">{t("common.company")}</option>
            {companies?.map((company) => (
              <option key={company._id} value={company._id}>
                {company.name}
              </option>
            ))}
          </ReportSelect>
        </ReportField>
      )}

      <ReportField label={t("users.firstName")} required error={errors.firstName?.message}>
        <ReportInput
          placeholder={t("users.firstName")}
          autoComplete="off"
          data-lpignore="true"
          {...register("firstName")}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
            setValue("firstName", cleaned, { shouldValidate: true, shouldDirty: true });
          }}
        />
      </ReportField>
      <ReportField label={t("users.lastName")} error={errors.lastName?.message}>
        <ReportInput
          placeholder={t("users.lastName")}
          autoComplete="off"
          data-lpignore="true"
          {...register("lastName")}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
            setValue("lastName", cleaned, { shouldValidate: true, shouldDirty: true });
          }}
        />
      </ReportField>
      <ReportField label={t("users.phone")} required error={errors.phone?.message}>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneInput
              id="phone"
              placeholder={t("users.phone")}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={Boolean(errors.phone)}
            />
          )}
        />
      </ReportField>
      <ReportField label={t("users.empId")} required error={errors.empID?.message}>
        {canEditEmpID ? (
          <ReportInput key="empID-editable" placeholder={t("users.empId")} {...register("empID")} />
        ) : (
          <ReportInput key="empID-disabled" disabled value={userData.empID ?? ""} />
        )}
      </ReportField>
      <ReportField label={t("users.email")} required error={errors.email?.message}>
        {canEditEmail ? (
          <ReportInput key="email-editable" placeholder={t("users.email")} type="email" {...register("email")} />
        ) : (
          <ReportInput key="email-disabled" disabled value={userData.email ?? ""} />
        )}
      </ReportField>

      {/* 2. Department */}
      {selectedRole !== "ceo" ? (
        <div className="md:col-span-2 space-y-2">
          <div className="text-sm font-medium text-foreground">
            {t("users.assignedDepartments")} <span className="text-danger">*</span>
          </div>
          <div className="text-xs text-muted-foreground mb-2">{t("users.selectDepartmentsHelp")}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {allowedDepartments.map((deptName) => {
              const isSelected = currentDepartments.some((d) => d.name === deptName);
              return (
                <Button
                  key={deptName}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className="justify-start text-xs h-9"
                  onClick={() => toggleDepartment(deptName as any)}
                >
                  {t(`departments.${deptName.toLowerCase()}`) || deptName}
                </Button>
              );
            })}
          </div>
          {errors.departments?.message ? (
            <p className="text-xs text-danger font-medium mt-1">{errors.departments.message}</p>
          ) : null}

          {currentDepartments.some((d) => d.name === "Marketing") && (
            <div className="mt-3 p-3 border rounded-lg bg-muted/20 space-y-2">
              <div className="text-xs font-semibold text-foreground">{t("users.marketingSubTeams")}</div>
              <div className="flex gap-2">
                {MARKETING_SUB_TEAMS.map((sub) => {
                  const marketingDept = currentDepartments.find((d) => d.name === "Marketing");
                  const isSubSelected = marketingDept?.subTeams?.includes(sub);
                  return (
                    <Button
                      key={sub}
                      type="button"
                      variant={isSubSelected ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => toggleMarketingSubTeam(sub)}
                    >
                      {t(`departments.subTeams.${sub.toLowerCase()}`) || sub}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* 3. Role */}
      <ReportField label={t("common.role")} required error={errors.role?.message}>
        {isTeamLead ? (
          <ReportInput disabled value={t("roles.team_member")} />
        ) : canEditRole ? (
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <ReportSelect
                {...field}
                onChange={(event) => {
                  const nextRole = event.target.value as NonNullable<UpdateUserValues["role"]>;
                  field.onChange(nextRole);
                }}
              >
                {availableRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {t(`roles.${role}`) || CREATE_USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </ReportSelect>
            )}
          />
        ) : (
          <ReportInput disabled value={t(`roles.${normalizeRole(userData.role) ?? "team_member"}`) || ROLE_LABELS[normalizeRole(userData.role) ?? "team_member"]} />
        )}
      </ReportField>

      {/* 4. Manager */}
      {isTeamLead ? (
        <ReportField className="md:col-span-2" label={t("common.manager")}>
          <input type="hidden" {...register("managerName")} />
          <ReportInput disabled value={sessionUserName || "Team Lead"} />
        </ReportField>
      ) : selectedRole === "hod" ? (
        <ReportField className="md:col-span-2" label={t("common.manager")}>
          <input type="hidden" {...register("managerName")} />
          <div className="flex h-11 w-full items-center rounded-xl border border-input bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
            {sessionUser?.role === "ceo" ? sessionUser.name : "CEO"}
          </div>
        </ReportField>
      ) : selectedRole !== "ceo" && selectedRole !== "admin" ? (
        <ReportField className="md:col-span-2" label={selectedRole === "team_member" ? `${t("roles.team_lead")} (${t("common.manager")})` : selectedRole === "report_manager" || selectedRole === "team_lead" ? `${t("roles.hod")} (${t("common.manager")})` : t("common.manager")} required error={errors.managerName?.message}>
          {canEditManagerName ? (
            <Controller
              control={control}
              name="managerName"
              render={({ field }) => (
                <ReportSelect {...field}>
                  <option value="">{selectedRole === "team_member" ? t("users.selectManager") : t("users.selectManager")}</option>
                  {managerSelectOptions.map((manager) => (
                    <option key={manager._id} value={manager.name}>
                      {manager.name}
                    </option>
                  ))}
                </ReportSelect>
              )}
            />
          ) : (
            <ReportInput disabled value={managerName ?? userData.managerName ?? ""} />
          )}
        </ReportField>
      ) : null}

      {/* 5. Team Type */}
      {selectedRole !== "ceo" && selectedRole !== "hod" && selectedRole !== "report_manager" ? (
        <div className="md:col-span-2">
          <Controller
            control={control}
            name="teamNames"
            render={({ field }) => (
              <ReportMultiSelectCards
                label={`${t("common.team")} (${t("common.teamType")})`}
                required={selectedRole === "team_lead" || selectedRole === "team_member"}
                helperText={teamTypeHelperText}
                emptyMessage={teamTypeEmptyMessage}
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
      ) : null}

      {/* 6. Skills */}
      {selectedRole !== "report_manager" && selectedRole !== "ceo" && selectedRole !== "hod" ? (
        <div className="md:col-span-2">
          <Controller
            control={control}
            name="roleTypes"
            render={({ field }) => (
              <ReportMultiSelectCards
                label={t("users.skills")}
                required
                helperText={t("users.selectSkillsHelp")}
                error={errors.roleTypes?.message}
                value={field.value ?? []}
                onChange={field.onChange}
                options={availableSkills.map((skill) => {
                  const skillKey = normalizeSkillKey(skill.name);
                  return {
                    value: skill.name,
                    label: t(`skills.${skillKey}`) || skill.name,
                    description: t(`skills.descriptions.${skillKey}`) || skill.description
                  };
                })}
              />
            )}
          />
        </div>
      ) : null}
      <ReportField label={t("common.status")} error={errors.status?.message}>
        <ReportSelect {...register("status")}>
          <option value="active">{t("common.active")}</option>
          <option value="inactive">{t("common.inactive")}</option>
          <option value="suspended">{t("common.suspended")}</option>
        </ReportSelect>
      </ReportField>
      {canResetPassword ? (
        <div className="md:col-span-2 rounded-md border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-foreground">{t("users.resetPassword")}</div>
              <div className="text-xs text-muted-foreground">{t("users.resetPasswordHelp")}</div>
            </div>
            <Button
              type="button"
              variant={resetPasswordEnabled ? "default" : "outline"}
              onClick={() => {
                const nextState = !resetPasswordEnabled;
                setValue("resetPassword", nextState, { shouldValidate: true, shouldDirty: true });
                if (!nextState) {
                  setValue("newPassword", "");
                  setValue("confirmPassword", "");
                  clearErrors(["newPassword", "confirmPassword"]);
                }
              }}
            >
              {resetPasswordEnabled ? t("users.resetPassword") : t("users.resetPassword")}
            </Button>
          </div>
          {resetPasswordEnabled ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ReportField
                label={t("users.newPassword")}
                required
                error={errors.newPassword?.message}
              >
                <PasswordInput variant="report" showRules={true} placeholder={t("users.newPassword")} {...register("newPassword")} />
              </ReportField>
              <ReportField label={t("users.confirmPassword")} required error={errors.confirmPassword?.message}>
                <PasswordInput variant="report" placeholder={t("users.confirmPassword")} {...register("confirmPassword")} />
              </ReportField>
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      <div className="md:col-span-2 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!userData) return;
            reset({
              firstName: userData.firstName ?? "",
              lastName: userData.lastName ?? "",
              phone: userData.phone ?? "",
              empID: userData.empID ?? "",
              role: normalizeRole(userData.role) ?? undefined,
              roleTypes: (userData.roleTypes ?? []) as UpdateUserValues["roleTypes"],
              workspaceId: userData.workspaceId ?? "",
              teamNames: normalizeUserTeamNames(userData) as UpdateUserValues["teamNames"],
              departments: (userData.departments ?? []) as UpdateUserValues["departments"],
              managerName: isTeamLead ? (sessionUserName || userData.managerName || "") : (userData.managerName ?? ""),
              email: userData.email ?? "",
              resetPassword: false,
              newPassword: "",
              confirmPassword: "",
              status: userData.status ?? "active",
              isActive: userData.isActive ?? true,
              isDeleted: userData.isDeleted ?? false,
              isAdminActive: userData.isAdminActive ?? false,
              isEmailActivated: userData.isEmailActivated ?? false
            });
            setValue("resetPassword", false);
          }}
        >
          {t("common.reset")}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : t("common.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
