"use client";

import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import { CREATE_USER_ROLE_LABELS, CREATE_USER_ROLE_OPTIONS, DEPARTMENT_OPTIONS, MARKETING_SUB_TEAMS, getSkillsForDepartments } from "@/lib/constants";
import { api } from "@/lib/api";
import { adminCreateUserSchema, clientCreateUserSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ReportField, ReportInput, ReportMultiSelectCards, ReportSelect } from "@/components/forms/report-controls";
import { PasswordInput } from "@/components/forms/password-input";
import { PhoneInput } from "@/components/forms/phone-input";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useTranslation } from "@/lib/i18n";
import { normalizeSkillKey } from "@/lib/skills-i18n";

type AdminUserValues = z.infer<typeof clientCreateUserSchema>;

type ManagerOption = {
  _id: string;
  name: string;
  role?: string;
  teamName?: string | null;
  teamNames?: string[] | null;
  departments?: Array<{ name: string; subTeams?: string[] }> | null;
};

type ManagerPools = {
  teamLeads: ManagerOption[];
  hods: ManagerOption[];
};

type CompanyOption = {
  _id: string;
  name: string;
  type?: "ceo" | "company";
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

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone number",
  empID: "Employee ID",
  email: "Email address",
  password: "Password",
  confirmPassword: "Confirm password",
  workspaceId: "Workspace",
  managerName: "Manager",
  teamNames: "Team",
  departments: "Department",
  roleTypes: "Skill"
};

function customZodResolver<T extends z.ZodType<any>>(schema: T) {
  return (values: any) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, any> = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (path && !errors[path]) {
        const label = FIELD_LABELS[path] || path;
        let message = issue.message;
        if (!message || message === "Invalid input" || message === "Required") {
          message = `${label} is required`;
        }
        errors[path] = {
          type: issue.code,
          message
        };
      }
    });
    return { values: {}, errors };
  };
}

export function AdminAddUserForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sessionUser } = useSession();
  const { t, isRtl } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const { data: companies } = useQuery<CompanyOption[]>({
    queryKey: ["header-active-companies"],
    queryFn: async () => {
      const response = await api.get("/api/companies");
      return response.data?.data as CompanyOption[];
    }
  });

  const activeSelectedCompany = useMemo(() => {
    if (!companies || companies.length === 0) return null;
    if (selectedCompanyId && selectedCompanyId !== "all") {
      const found = companies.find((c) => c._id === selectedCompanyId);
      if (found) return found;
    }
    return companies[0];
  }, [companies, selectedCompanyId]);

  const activeCompanyId = activeSelectedCompany?._id ?? sessionUser?.workspaceId ?? (selectedCompanyId !== "all" ? selectedCompanyId : "");

  const { data: teamTypes } = useQuery<TeamTypeOption[]>({
    queryKey: ["team-types", "admin-create-user", activeCompanyId],
    queryFn: async () => {
      const params: Record<string, string> = { department: "all" };
      if (activeCompanyId) {
        params.workspaceId = activeCompanyId;
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daily_report_selected_company");
      if (stored) setSelectedCompanyId(stored);

      const handleCompanyChange = (e: any) => {
        setSelectedCompanyId(e.detail);
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => window.removeEventListener("company-changed", handleCompanyChange);
    }
  }, []);

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
    resolver: customZodResolver(clientCreateUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      empID: "",
      role: "team_member",
      roleTypes: [],
      workspaceId: "",
      teamNames: [],
      departments: [],
      managerName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role") as AdminUserValues["role"] | null;

  const availableRoleOptions = useMemo(() => {
    if (sessionUser?.role !== "admin") {
      return CREATE_USER_ROLE_OPTIONS.filter((role) => role !== "ceo");
    }
    return CREATE_USER_ROLE_OPTIONS;
  }, [sessionUser?.role]);

  useEffect(() => {
    if (initialRoleParam && (availableRoleOptions as string[]).includes(initialRoleParam)) {
      setValue("role", initialRoleParam);
    }
    if (initialRoleParam === "ceo" && sessionUser && sessionUser.role !== "admin") {
      router.push("/login");
    }
  }, [initialRoleParam, availableRoleOptions, sessionUser, router, setValue]);

  const selectedRole = useWatch({ control, name: "role" });
  const currentRoleTypes = useWatch({ control, name: "roleTypes" });
  const currentTeamNames = useWatch({ control, name: "teamNames" });
  const currentDepartments = useWatch({ control, name: "departments" }) ?? [];
  const currentManagerName = useWatch({ control, name: "managerName" });
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
    if (selectedRole === "hod") return [{ _id: "admin", name: t("roles.admin") }];
    if (selectedRole === "team_lead" || selectedRole === "report_manager") {
      if (selectedDepartmentNames.length > 0) {
        const filtered = hodOptions.filter((manager: any) => {
          if (!manager.departments || manager.departments.length === 0) return true;
          return manager.departments.some((d: any) =>
            selectedDepartmentNames.some((sd) => sd.trim().toLowerCase() === d.name?.trim().toLowerCase())
          );
        });
        return filtered.length > 0 ? filtered : hodOptions;
      }
      return hodOptions;
    }
    if (selectedRole === "team_member") {
      if (selectedDepartmentNames.length > 0) {
        const filteredTeamLeads = teamLeadOptions.filter((manager: any) => {
          if (manager.departments && manager.departments.length > 0) {
            const hasDept = manager.departments.some((d: any) =>
              selectedDepartmentNames.some((sd) => sd.trim().toLowerCase() === d.name?.trim().toLowerCase())
            );
            if (hasDept) return true;
          }
          const managerTeams = normalizeTeamNames(manager.teamName ?? null, manager.teamNames ?? null);
          if (managerTeams.length > 0) {
            const hasMatchingTeam = managerTeams.some((tn) => {
              const matchedType = teamOptions.find(
                (t) => t.name.toLowerCase() === tn.toLowerCase() || (t.showName && t.showName.toLowerCase() === tn.toLowerCase())
              );
              return matchedType?.department && selectedDepartmentNames.some(
                (sd) => sd.trim().toLowerCase() === matchedType.department?.trim().toLowerCase()
              );
            });
            if (hasMatchingTeam) return true;
          }
          return false;
        });

        if (filteredTeamLeads.length > 0) {
          return filteredTeamLeads;
        }

        const deptHods = hodOptions.filter((m: any) =>
          m.departments?.some((d: any) =>
            selectedDepartmentNames.some((sd) => sd.trim().toLowerCase() === d.name?.trim().toLowerCase())
          )
        );
        if (deptHods.length > 0) {
          return deptHods;
        }
      }
      return teamLeadOptions;
    }
    return teamLeadOptions;
  }, [hodOptions, selectedDepartmentNames, selectedRole, teamLeadOptions, teamOptions]);

  const availableTeamOptions = useMemo(() => {
    if (selectedRole === "ceo" || selectedRole === "hod" || selectedRole === "report_manager") return [];

    if (selectedRole === "team_member") {
      if (!currentManagerName) {
        return [];
      }
      const selectedManager = managerSelectOptions.find((m) => m.name === currentManagerName);
      const managerTeams = normalizeTeamNames(selectedManager?.teamName ?? null, selectedManager?.teamNames ?? null);

      if (managerTeams.length > 0) {
        const normalizedManagerTeams = managerTeams.map((t) => t.trim().toLowerCase());
        const filtered = teamOptions.filter(
          (team) =>
            normalizedManagerTeams.includes(team.name.trim().toLowerCase()) ||
            (team.showName && normalizedManagerTeams.includes(team.showName.trim().toLowerCase()))
        );
        if (filtered.length > 0) return filtered;
        return managerTeams.map((name) => ({
          _id: name,
          name: name,
          showName: name
        }));
      }

      if (selectedManager?.role === "hod" || selectedManager?.role === "report_manager" || selectedManager?.role === "admin" || selectedManager?.role === "ceo") {
        if (selectedDepartmentNames.length > 0) {
          return teamOptions.filter((team) => {
            if (!team.department) return false;
            return selectedDepartmentNames.some(
              (sd) => sd.trim().toLowerCase() === team.department?.trim().toLowerCase()
            );
          });
        }
        return teamOptions;
      }

      return [];
    }

    if (selectedDepartmentNames.length > 0) {
      return teamOptions.filter((team) => team.department && selectedDepartmentNames.includes(team.department as any));
    }
    return teamOptions;
  }, [currentManagerName, managerSelectOptions, selectedDepartmentNames, selectedRole, teamOptions]);

  const teamTypeEmptyMessage = useMemo(() => {
    if (selectedRole === "team_member") {
      if (!currentManagerName) {
        return t("users.selectManager") || "Select a manager first to view available team types.";
      }
      return t("teamTypes.noTeamTypesFound") || "No team types available for the selected manager.";
    }
    if (selectedRole === "team_lead") {
      return t("teamTypes.noTeamTypesFound") || "No team types available for the selected department.";
    }
    return t("teamTypes.noTeamTypesFound") || "No team types available.";
  }, [selectedRole, currentManagerName, t]);

  const teamTypeHelperText = useMemo(() => {
    if (selectedRole === "team_member") {
      return currentManagerName
        ? t("users.selectTeamType")
        : t("users.selectManager");
    }
    if (selectedRole === "team_lead") {
      return t("users.selectTeamType");
    }
    return t("users.selectTeamType");
  }, [selectedRole, currentManagerName, t]);

  const sessionUserRole = sessionUser?.role;
  const sessionUserName = sessionUser?.name;

  useEffect(() => {
    if (activeCompanyId) {
      setValue("workspaceId", activeCompanyId);
    }
  }, [activeCompanyId, setValue]);

  useEffect(() => {
    if (selectedRole === "ceo" || selectedRole === "hod" || selectedRole === "report_manager") {
      if (currentRoleTypes?.length) {
        setValue("roleTypes", []);
      }
      if (currentTeamNames?.length) {
        setValue("teamNames", []);
      }
      if (selectedRole === "ceo" && currentDepartments.length > 0) {
        setValue("departments", []);
      }
      if (selectedRole === "hod") {
        const ceoManager = sessionUserRole === "ceo" ? (sessionUserName || "CEO") : "CEO";
        if (currentManagerName !== ceoManager) {
          setValue("managerName", ceoManager);
        }
      }
      return;
    }

    if (!currentRoleTypes?.length && selectedDepartmentNames.length > 0 && availableSkills.length > 0) {
      setValue("roleTypes", [availableSkills[0].name as any]);
    }

    if (currentManagerName && !managerSelectOptions.some((manager) => manager.name === currentManagerName)) {
      setValue("managerName", "");
    }
  }, [
    selectedRole,
    sessionUserRole,
    sessionUserName,
    selectedDepartmentNames.length,
    availableSkills.length,
    currentRoleTypes?.length,
    currentTeamNames?.length,
    currentDepartments.length,
    currentManagerName,
    managerSelectOptions,
    setValue
  ]);

  useEffect(() => {
    if (selectedRole === "ceo" || selectedRole === "hod" || selectedRole === "report_manager") return;

    if (availableTeamOptions.length === 0) {
      if (currentTeamNames?.length) {
        setValue("teamNames", []);
      }
      return;
    }

    const validTeamNames = currentTeamNames?.filter((teamName) =>
      availableTeamOptions.some((team) => team.name === teamName || (team.showName && team.showName === teamName))
    ) ?? [];

    if (validTeamNames.length !== currentTeamNames?.length) {
      setValue("teamNames", validTeamNames);
    }
  }, [availableTeamOptions, currentTeamNames, selectedRole, setValue]);

  useEffect(() => {
    // Clear invalid role types when available skills change
    if (selectedRole !== "report_manager" && selectedRole !== "ceo" && selectedRole !== "hod" && currentRoleTypes && currentRoleTypes.length > 0) {
      const validSkillNames = availableSkills.map((s) => s.name);
      const filteredRoleTypes = currentRoleTypes.filter((rt) => validSkillNames.includes(rt));
      if (filteredRoleTypes.length !== currentRoleTypes.length) {
        setValue("roleTypes", filteredRoleTypes as AdminUserValues["roleTypes"]);
      }
    }
  }, [availableSkills, currentRoleTypes, selectedRole, setValue]);

  const toggleDepartment = (deptName: "Construction" | "Software" | "Finance" | "Marketing") => {
    const exists = currentDepartments.some((d) => d.name === deptName);
    let next: typeof currentDepartments;
    if (exists) {
      next = currentDepartments.filter((d) => d.name !== deptName);
    } else {
      next = [...currentDepartments, { name: deptName, subTeams: deptName === "Marketing" ? ["Physical"] : [] }];
    }
    setValue("departments", next, { shouldValidate: true, shouldDirty: true });
  };

  const toggleMarketingSubTeam = (sub: string) => {
    const marketingIndex = currentDepartments.findIndex((d) => d.name === "Marketing");
    if (marketingIndex === -1) return;

    const currentSubTeams = currentDepartments[marketingIndex].subTeams ?? [];
    let updatedSubTeams: string[];
    if (currentSubTeams.includes(sub)) {
      if (currentSubTeams.length === 1) return;
      updatedSubTeams = currentSubTeams.filter((s) => s !== sub);
    } else {
      updatedSubTeams = [...currentSubTeams, sub];
    }

    const nextDepartments = [...currentDepartments];
    nextDepartments[marketingIndex] = {
      ...nextDepartments[marketingIndex],
      subTeams: updatedSubTeams
    };
    setValue("departments", nextDepartments, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (values: AdminUserValues) => {
    setMessage(null);
    setError(null);

    const resolvedWorkspaceId = values.role === "ceo" ? undefined : (values.workspaceId || activeCompanyId || undefined);
    const resolvedManagerName = values.role === "ceo" ? undefined : values.managerName;
    const resolvedTeamNames = (values.role === "ceo" || values.role === "hod" || values.role === "report_manager") ? [] : values.teamNames;

    const payload = {
      ...values,
      workspaceId: resolvedWorkspaceId,
      managerName: resolvedManagerName,
      teamNames: resolvedTeamNames
    };

    const parsed = adminCreateUserSchema.safeParse(payload);
    if (!parsed.success) {
      clearErrors();
      let firstErrorMsg = "";
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path.join(".") as keyof AdminUserValues;
        setFieldError(fieldName, {
          type: "manual",
          message: issue.message || "Invalid input"
        });
        if (!firstErrorMsg) firstErrorMsg = issue.message || "Validation failed";
      });
      setError(firstErrorMsg);
      return;
    }

    try {
      await api.post("/api/admin/users", parsed.data);
      reset({
        firstName: "",
        lastName: "",
        phone: "",
        empID: "",
        role: "team_member",
        roleTypes: [],
        workspaceId: activeCompanyId || "",
        teamNames: [],
        departments: [],
        managerName: "",
        email: "",
        password: "",
        confirmPassword: ""
      });
      setMessage(t("users.userCreated"));
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setTimeout(() => {
        if (values.role === "ceo") {
          router.push("/admin/users?role=ceo");
        } else {
          router.push("/admin/users");
        }
      }, 500);
    } catch (requestError) {
      const errorData = axios.isAxiosError(requestError) ? requestError.response?.data : null;
      const responseMessage = errorData?.message ?? (axios.isAxiosError(requestError) ? requestError.message : null);
      if (errorData?.statusCode === 2004 || responseMessage?.toLowerCase().includes("employee id")) {
        setFieldError("empID", {
          type: "server",
          message: responseMessage || "Employee ID already exists. Please enter a unique Employee ID."
        });
      }
      setError(responseMessage ?? t("common.somethingWentWrong"));
    }
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
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
        <ReportInput placeholder={t("users.empId")} {...register("empID")} />
      </ReportField>
      <ReportField label={t("users.email")} required error={errors.email?.message}>
        <ReportInput placeholder={t("users.email")} type="email" {...register("email")} />
      </ReportField>
      <ReportField label={t("users.password")} required error={errors.password?.message}>
        <PasswordInput variant="report" showRules={true} placeholder={t("users.password")} {...register("password")} />
      </ReportField>
      <ReportField label={t("users.confirmPassword")} required error={errors.confirmPassword?.message}>
        <PasswordInput variant="report" placeholder={t("users.confirmPassword")} {...register("confirmPassword")} />
      </ReportField>

      <div className="md:col-span-2 flex justify-end rtl:justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const lowers = "abcdefghijklmnopqrstuvwxyz";
            const numbers = "0123456789";
            const specials = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
            const all = uppers + lowers + numbers + specials;
            let pass = "";
            pass += uppers[Math.floor(Math.random() * uppers.length)];
            pass += lowers[Math.floor(Math.random() * lowers.length)];
            pass += numbers[Math.floor(Math.random() * numbers.length)];
            pass += specials[Math.floor(Math.random() * specials.length)];
            for (let i = 0; i < 8; i++) {
              pass += all[Math.floor(Math.random() * all.length)];
            }
            pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
            setValue("password", pass, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            setValue("confirmPassword", pass, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            clearErrors(["password", "confirmPassword"]);
          }}
          className="text-xs h-8"
        >
          {t("users.suggestStrongPassword", "Suggest Strong Password")}
        </Button>
      </div>

      {sessionUser?.role === "ceo" ? (
        <ReportField className="md:col-span-2" label={t("common.company")}>
          <input type="hidden" {...register("workspaceId")} />
          <div className="flex h-11 w-full items-center rounded-xl border border-input bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
            {activeSelectedCompany ? activeSelectedCompany.name : t("common.loading")}
          </div>
        </ReportField>
      ) : selectedRole !== "ceo" ? (
        <ReportField className="md:col-span-2" label={t("common.company")} required error={errors.workspaceId?.message}>
          <ReportSelect {...register("workspaceId")}>
            <option value="">{t("common.company")}</option>
            {companies?.map((company) => (
              <option key={company._id} value={company._id}>
                {company.name} {company.type === "ceo" ? `(${t("companies.ceoWorkspace", "CEO Workspace")})` : `(${t("common.company", "Company")})`}
              </option>
            ))}
          </ReportSelect>
        </ReportField>
      ) : null}

      {/* 2. Department */}
      {selectedRole !== "ceo" ? (
        <div className="md:col-span-2 space-y-2">
          <div className="text-sm font-medium text-foreground">
            {t("users.assignedDepartments")} <span className="text-danger">*</span>
          </div>
          <div className="text-xs text-muted-foreground mb-2">{t("users.selectDepartmentsHelp", "Select one or more primary departments for this user.")}</div>
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
                  {t(`departments.${deptName.toLowerCase()}`, deptName)}
                </Button>
              );
            })}
          </div>
          {errors.departments?.message ? (
            <p className="text-xs text-danger font-medium mt-1">{errors.departments.message}</p>
          ) : null}

          {currentDepartments.some((d) => d.name === "Marketing") && (
            <div className="mt-3 p-3 border rounded-lg bg-muted/20 space-y-2">
              <div className="text-xs font-semibold text-foreground">{t("users.marketingSubTeams", "Marketing Sub-Teams")}</div>
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
                      {t(`departments.subTeams.${sub.toLowerCase()}`, sub)}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* 3. Role */}
      {selectedRole !== "ceo" ? (
        <ReportField label={t("common.role")} required error={errors.role?.message}>
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
                {availableRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {t(`roles.${role}`) || CREATE_USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </ReportSelect>
            )}
          />
        </ReportField>
      ) : null}

      {/* 4. Manager */}
      {selectedRole === "hod" ? (
        <ReportField className="md:col-span-2" label={t("common.manager")}>
          <input type="hidden" {...register("managerName")} />
          <div className="flex h-11 w-full items-center rounded-xl border border-input bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
            {sessionUser?.role === "ceo" ? sessionUser.name : t("roles.ceo", "CEO")}
          </div>
        </ReportField>
      ) : selectedRole !== "ceo" && selectedRole !== "admin" ? (
        <ReportField className="md:col-span-2" label={selectedRole === "team_member" ? `${t("roles.team_lead")} (${t("common.manager")})` : selectedRole === "report_manager" || selectedRole === "team_lead" ? `${t("roles.hod")} (${t("common.manager")})` : t("common.manager")} required error={errors.managerName?.message}>
          <ReportSelect {...register("managerName")}>
            <option value="">{selectedRole === "team_member" ? t("users.selectManager") : t("users.selectManager")}</option>
            {managerSelectOptions.map((manager) => (
              <option key={manager._id} value={manager.name}>
                {manager.name}
              </option>
            ))}
          </ReportSelect>
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
                helperText={t("users.selectSkillsHelp", "Select one or more skills for this user (dynamically filtered based on chosen department).")}
                error={errors.roleTypes?.message}
                value={field.value ?? []}
                onChange={field.onChange}
                options={availableSkills.map((skill) => {
                  const skillKey = normalizeSkillKey(skill.name);
                  return {
                    value: skill.name,
                    label: t(`skills.${skillKey}`, skill.name),
                    description: t(`skills.descriptions.${skillKey}`, skill.description)
                  };
                })}
              />
            )}
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      <Button className="md:col-span-2 w-fit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("common.creating") : selectedRole === "ceo" ? `${t("common.create")} ${t("roles.ceo", "CEO")}` : t("users.addEmployee")}
      </Button>
    </form>
  );
}
