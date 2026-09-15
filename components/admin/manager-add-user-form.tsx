"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelectedCompany } from "@/hooks/use-selected-company";
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
import { adminCreateUserSchema, clientCreateUserSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportField, ReportInput, ReportMultiSelectCards, ReportSelect } from "@/components/forms/report-controls";
import { PasswordInput } from "@/components/forms/password-input";
import { PhoneInput } from "@/components/forms/phone-input";
import type { SessionUser } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";
import { normalizeSkillKey } from "@/lib/skills-i18n";

type CreateUserValues = z.infer<typeof clientCreateUserSchema>;

type TeamTypeOption = {
  _id: string;
  name: string;
  showName?: string;
  department?: string;
};

type ManagerOption = {
  _id: string;
  name: string;
  role?: string;
  teamName?: string | null;
  teamNames?: string[] | null;
  departments?: Array<{ name: string; subTeams?: string[] }> | null;
};

type CompanyOption = {
  _id: string;
  name: string;
  type?: "ceo" | "company";
};

const HOD_ROLE_OPTIONS = ["team_lead", "report_manager", "team_member"] as const;

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

export function ManagerAddUserForm({ currentUser: propCurrentUser }: { currentUser?: SessionUser } = {}) {
  const { t, isRtl } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const teamLeadDefaultsAppliedRef = useRef(false);

  const { data: fetchedUser } = useQuery({
    queryKey: ["current-user"],
    enabled: !propCurrentUser,
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return response.data?.data as SessionUser | null;
    },
    staleTime: 60_000
  });

  const currentUser = propCurrentUser ?? fetchedUser;

  const { data: companies } = useQuery<CompanyOption[]>({
    queryKey: ["header-active-companies"],
    queryFn: async () => {
      const response = await api.get("/api/companies");
      return response.data?.data as CompanyOption[];
    }
  });

  const selectedCompanyId = useSelectedCompany();

  const activeSelectedCompany = useMemo(() => {
    if (!companies || companies.length === 0) return null;
    if (selectedCompanyId && selectedCompanyId !== "all") {
      const found = companies.find((c) => c._id === selectedCompanyId);
      if (found) return found;
    }
    return companies[0];
  }, [companies, selectedCompanyId]);

  const activeCompanyId = activeSelectedCompany?._id ?? currentUser?.workspaceId ?? (selectedCompanyId !== "all" ? selectedCompanyId : "");

  const { data: teamTypes } = useQuery<TeamTypeOption[]>({
    queryKey: ["team-types", activeCompanyId],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const params: Record<string, string> = { department: "all" };
      if (activeCompanyId) {
        params.workspaceId = activeCompanyId;
      }
      const response = await api.get("/api/team-types", { params });
      return (response.data?.data ?? []) as TeamTypeOption[];
    },
    staleTime: 0
  });

  const { data: teamLeadOptions = [] } = useQuery<ManagerOption[]>({
    queryKey: ["team-leads-for-create", currentUser?.role, currentUser?.workspaceId, activeCompanyId],
    enabled: Boolean(currentUser) && currentUser?.role !== "team_lead",
    queryFn: async () => {
      const response = await api.get("/api/admin/users", {
        params: {
          role: "team_lead",
          workspaceId: activeCompanyId || currentUser?.workspaceId
        }
      });
      return (response.data?.data ?? []) as ManagerOption[];
    },
    staleTime: 60_000
  });

  const { data: hodOptions = [] } = useQuery<ManagerOption[]>({
    queryKey: ["hods-for-create", currentUser?.role, currentUser?.workspaceId, activeCompanyId],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get("/api/admin/users", {
        params: {
          role: "hod",
          workspaceId: activeCompanyId || currentUser?.workspaceId
        }
      });
      return (response.data?.data ?? []) as ManagerOption[];
    },
    staleTime: 60_000
  });

  const { data: rmOptions = [] } = useQuery<ManagerOption[]>({
    queryKey: ["rms-for-create", currentUser?.role, currentUser?.workspaceId, activeCompanyId],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get("/api/admin/users", {
        params: {
          role: "report_manager",
          workspaceId: activeCompanyId || currentUser?.workspaceId
        }
      });
      return (response.data?.data ?? []) as ManagerOption[];
    },
    staleTime: 60_000
  });

  const teamOptions = useMemo(() => teamTypes ?? [], [teamTypes]);
  const isCeo = currentUser?.role === "ceo";
  const isTeamLead = currentUser?.role === "team_lead";
  const isReportManager = currentUser?.role === "report_manager";
  const isHod = currentUser?.role === "hod";

  const roleOptions = isCeo
    ? ["hod", "report_manager", "team_lead", "team_member"]
    : isHod
    ? ["report_manager", "team_lead", "team_member"]
    : isReportManager
    ? ["team_lead", "team_member"]
    : ["team_member"];

  const currentUserTeamNames = useMemo(
    () => normalizeTeamNames(currentUser?.teamName ?? null, currentUser?.teamNames ?? null),
    [currentUser?.teamName, currentUser?.teamNames]
  );

  const allowedDepartments = useMemo(() => {
    if (currentUser?.departments && currentUser.departments.length > 0) {
      return currentUser.departments.map((d: any) => typeof d === "string" ? d : d.name);
    }
    if (currentUserTeamNames.length > 0 && teamTypes) {
      const depts = new Set<string>();
      currentUserTeamNames.forEach((tn: string) => {
        const teamInfo = teamTypes.find((t) => t.name.toLowerCase() === tn.toLowerCase() || (t.showName && t.showName.toLowerCase() === tn.toLowerCase()));
        if (teamInfo?.department) depts.add(teamInfo.department);
      });
      if (depts.size > 0) return Array.from(depts);
    }
    return DEPARTMENT_OPTIONS;
  }, [currentUser?.departments, currentUserTeamNames, teamTypes]);

  const [selectedHeaderDept, setSelectedHeaderDept] = useState<string>("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("daily_report_selected_department");
      if (stored) setSelectedHeaderDept(stored);
    }
    const handleDeptChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setSelectedHeaderDept(customEvent.detail);
      }
    };
    window.addEventListener("department-changed", handleDeptChange);
    return () => window.removeEventListener("department-changed", handleDeptChange);
  }, []);

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
    resolver: customZodResolver(clientCreateUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      empID: "",
      workspaceId: activeCompanyId,
      teamNames: isTeamLead && currentUserTeamNames.length
        ? (selectedHeaderDept && selectedHeaderDept !== "all" && currentUserTeamNames.map(t => t.toLowerCase()).includes(selectedHeaderDept.toLowerCase())
            ? [currentUserTeamNames.find(t => t.toLowerCase() === selectedHeaderDept.toLowerCase())!]
            : [currentUserTeamNames[0]])
        : [],
      departments: selectedHeaderDept && selectedHeaderDept !== "all" && DEPARTMENT_OPTIONS.includes(selectedHeaderDept as any)
        ? [{ name: selectedHeaderDept as any, subTeams: [] }]
        : (allowedDepartments.length > 0 ? [{ name: allowedDepartments[0] as any, subTeams: [] }] : []),
      managerName: isTeamLead ? currentUser?.name ?? "" : "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    if (activeCompanyId) {
      setValue("workspaceId", activeCompanyId);
    }
  }, [activeCompanyId, setValue]);

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

  const managerSelectOptions = useMemo(() => {
    let options: ManagerOption[] = [];
    if (isTeamLead) return [];

    if (selectedRole === "hod") {
      if (isCeo && currentUser) {
        options = [{ _id: currentUser.id, name: currentUser.name || currentUser.email }];
      } else {
        options = [{ _id: "ceo", name: "CEO" }];
      }
    } else if (selectedRole === "report_manager") {
      if (isHod && currentUser) {
        options = [{ _id: currentUser.id, name: currentUser.name || currentUser.email }];
      } else if (selectedDepartmentNames.length > 0) {
        const filtered = hodOptions.filter((manager) => {
          if (!manager.departments || manager.departments.length === 0) return true;
          return manager.departments.some((d: any) =>
            selectedDepartmentNames.some((sd) => sd.trim().toLowerCase() === d.name?.trim().toLowerCase())
          );
        });
        options = filtered.length > 0 ? filtered : hodOptions;
      } else {
        options = hodOptions;
      }
    } else if (selectedRole === "team_lead") {
      if (isHod && currentUser) {
        options = [{ _id: currentUser.id, name: currentUser.name || currentUser.email }];
      } else if (isReportManager && currentUser) {
        options = [{ _id: currentUser.id, name: currentUser.name || currentUser.email }];
      } else {
        const deptRMs = selectedDepartmentNames.length > 0
          ? rmOptions.filter((manager) => {
              if (!manager.departments || manager.departments.length === 0) return true;
              return manager.departments.some((d: any) =>
                selectedDepartmentNames.some((sd) => sd.trim().toLowerCase() === d.name?.trim().toLowerCase())
              );
            })
          : rmOptions;
        const deptHods = selectedDepartmentNames.length > 0
          ? hodOptions.filter((manager) => {
              if (!manager.departments || manager.departments.length === 0) return true;
              return manager.departments.some((d: any) =>
                selectedDepartmentNames.some((sd) => sd.trim().toLowerCase() === d.name?.trim().toLowerCase())
              );
            })
          : hodOptions;
        options = deptRMs.length > 0 ? deptRMs : deptHods.length > 0 ? deptHods : (rmOptions.length > 0 ? rmOptions : hodOptions);
      }
    } else if (selectedRole === "team_member") {
      if (selectedDepartmentNames.length > 0) {
        const filteredTeamLeads = teamLeadOptions.filter((manager) => {
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
          options = filteredTeamLeads;
        } else {
          const deptRMs = rmOptions.filter((m) =>
            m.departments?.some((d: any) =>
              selectedDepartmentNames.some((sd) => sd.trim().toLowerCase() === d.name?.trim().toLowerCase())
            )
          );
          const deptHods = hodOptions.filter((m) =>
            m.departments?.some((d: any) =>
              selectedDepartmentNames.some((sd) => sd.trim().toLowerCase() === d.name?.trim().toLowerCase())
            )
          );
          if (deptRMs.length > 0 || deptHods.length > 0) {
            options = [...deptRMs, ...deptHods];
          } else {
            options = teamLeadOptions;
          }
        }
      } else {
        options = teamLeadOptions;
      }
    } else {
      options = teamLeadOptions;
    }

    const unique = new Map<string, ManagerOption>();
    for (const opt of options) {
      if (opt.name && !unique.has(opt.name)) {
        unique.set(opt.name, opt);
      }
    }
    return Array.from(unique.values());
  }, [currentUser, hodOptions, isCeo, isTeamLead, rmOptions, selectedDepartmentNames, selectedRole, teamLeadOptions, teamOptions]);

  const availableTeamOptions = useMemo(() => {
    if (selectedRole === "hod" || selectedRole === "report_manager" || selectedRole === "ceo") {
      return [];
    }

    if (isTeamLead) {
      if (currentUserTeamNames.length > 0) {
        const normalizedAllowed = currentUserTeamNames.map((t) => t.trim().toLowerCase());
        const filtered = teamOptions.filter(
          (team) =>
            normalizedAllowed.includes(team.name.trim().toLowerCase()) ||
            (team.showName && normalizedAllowed.includes(team.showName.trim().toLowerCase()))
        );
        if (filtered.length > 0) return filtered;
        return currentUserTeamNames.map((name) => ({
          _id: name,
          name: name,
          showName: name
        }));
      }
      return [];
    }

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
      const deptTeams = teamOptions.filter((team) => {
        if (!team.department) return false;
        return selectedDepartmentNames.some(
          (sd) => sd.trim().toLowerCase() === team.department?.trim().toLowerCase()
        );
      });
      return deptTeams;
    }

    return teamOptions;
  }, [
    currentUserTeamNames,
    isTeamLead,
    selectedRole,
    currentManagerName,
    managerSelectOptions,
    teamOptions,
    selectedDepartmentNames
  ]);

  const teamTypeEmptyMessage = useMemo(() => {
    if (isTeamLead) {
      return "No team types assigned to your account.";
    }
    if (selectedRole === "team_member") {
      if (!currentManagerName) {
        return "Select a manager first to view available team types.";
      }
      return "No team types available for the selected manager.";
    }
    if (selectedRole === "team_lead") {
      return "No team types available for the selected department.";
    }
    return "No team types available.";
  }, [isTeamLead, selectedRole, currentManagerName]);

  const teamTypeHelperText = useMemo(() => {
    if (isTeamLead) {
      return "Choose one or more team types from your assigned team list.";
    }
    if (selectedRole === "team_member") {
      return currentManagerName
        ? "Choose at least one team type managed by the selected team lead."
        : "Select a manager above to choose from their managed team types.";
    }
    if (selectedRole === "team_lead") {
      return "Choose at least one team type for this team lead.";
    }
    return "Choose one or more team types for this user.";
  }, [isTeamLead, selectedRole, currentManagerName]);

  useEffect(() => {
    const isHeaderDeptValid = selectedHeaderDept !== "all" && DEPARTMENT_OPTIONS.includes(selectedHeaderDept as any);
    if (isHeaderDeptValid) {
      const currentDeptName = currentDepartments[0]?.name;
      if (currentDeptName !== selectedHeaderDept) {
        setValue("departments", [{ name: selectedHeaderDept as any, subTeams: selectedHeaderDept === "Marketing" ? ["Physical"] : [] }], {
          shouldValidate: true,
          shouldDirty: true
        });
      }
    } else {
      const isCurrentDeptValid = currentDepartments.length > 0 && DEPARTMENT_OPTIONS.includes(currentDepartments[0]?.name as any);
      if (!isCurrentDeptValid && allowedDepartments.length > 0) {
        const initialDept = allowedDepartments[0];
        setValue("departments", [{ name: initialDept as any, subTeams: initialDept === "Marketing" ? ["Physical"] : [] }], {
          shouldValidate: true
        });
      }
    }
  }, [selectedHeaderDept, allowedDepartments, setValue, currentDepartments]);

  useEffect(() => {
    if (!currentUser || !isTeamLead) return;

    if (currentManagerName !== currentUser.name) {
      setValue("managerName", currentUser.name);
    }
    if (selectedRole !== "team_member") {
      setValue("role", "team_member");
    }
  }, [currentManagerName, currentUser, isTeamLead, selectedRole, setValue]);

  useEffect(() => {
    if (isTeamLead || !currentUser) return;

    if (selectedRole === "hod") {
      const ceoName = isCeo ? (currentUser.name || currentUser.email) : "CEO";
      if (currentManagerName !== ceoName) {
        setValue("managerName", ceoName);
      }
      return;
    }

    if (isHod && (selectedRole === "team_lead" || selectedRole === "report_manager")) {
      if (currentManagerName !== currentUser.name) {
        setValue("managerName", currentUser.name);
      }
      return;
    }

    if (isReportManager && selectedRole === "team_lead") {
      if (currentManagerName !== currentUser.name) {
        setValue("managerName", currentUser.name);
      }
      return;
    }

    if (currentManagerName && !managerSelectOptions.some((manager) => manager.name === currentManagerName)) {
      setValue("managerName", "");
    }
  }, [currentManagerName, currentUser, isCeo, isHod, isReportManager, isTeamLead, managerSelectOptions, selectedRole, setValue]);

  useEffect(() => {
    if (selectedRole === "hod" || selectedRole === "report_manager") return;
    if (currentRoleTypes && currentRoleTypes.length > 0) {
      const validSkillNames = availableSkills.map((s) => s.name);
      const filteredRoleTypes = currentRoleTypes.filter((rt) => validSkillNames.includes(rt));
      if (filteredRoleTypes.length !== currentRoleTypes.length) {
        setValue("roleTypes", filteredRoleTypes as CreateUserValues["roleTypes"]);
      }
    }
  }, [availableSkills, currentRoleTypes, selectedRole, setValue]);

  useEffect(() => {
    if (selectedRole === "hod" || selectedRole === "report_manager" || selectedRole === "ceo") {
      if (currentRoleTypes?.length) {
        setValue("roleTypes", []);
      }
      if (currentTeamNames?.length) {
        setValue("teamNames", []);
      }
      return;
    }

    if (!currentRoleTypes?.length && selectedDepartmentNames.length > 0 && availableSkills.length > 0) {
      setValue("roleTypes", [availableSkills[0].name as any]);
    }

    if (availableTeamOptions.length === 0) {
      if (currentTeamNames?.length) {
        setValue("teamNames", []);
      }
      return;
    }

    const validTeamNames = currentTeamNames?.filter((teamName) =>
      availableTeamOptions.some((team) => team.name === teamName || (team.showName && team.showName === teamName))
    ) ?? [];

    if (!sameStringList(validTeamNames, currentTeamNames)) {
      setValue("teamNames", validTeamNames);
    }
  }, [
    availableSkills,
    availableTeamOptions,
    currentRoleTypes?.length,
    currentTeamNames,
    selectedDepartmentNames.length,
    selectedRole,
    setValue
  ]);

  const onSubmit = async (values: CreateUserValues) => {
    setError(null);
    setMessage(null);

    const resolvedTeamNames =
      (values.role === "hod" || values.role === "report_manager")
        ? []
        : isTeamLead
          ? currentUserTeamNames.length
            ? values.teamNames.filter((teamName) => currentUserTeamNames.includes(teamName))
            : values.teamNames
          : values.teamNames;

    const resolvedWorkspaceId = values.workspaceId || activeCompanyId || currentUser?.workspaceId;
    const resolvedManagerName = isTeamLead ? currentUser?.name : (isHod && (values.role === "team_lead" || values.role === "report_manager")) ? currentUser?.name : values.managerName;

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
        const fieldName = issue.path.join(".") as keyof CreateUserValues;
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
        role: isTeamLead ? "team_member" : "team_member",
        roleTypes: [],
        teamNames: isTeamLead && currentUserTeamNames.length ? currentUserTeamNames : [],
        managerName: currentUser?.name ?? "",
        email: "",
        password: ""
      });
      setMessage(t("users.userCreated"));
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/report-manager/users"] });
      const redirectPath =
        currentUser?.role === "team_lead"
          ? "/team-lead/users"
          : currentUser?.role === "hod"
            ? "/hod/users"
            : currentUser?.role === "ceo"
              ? "/ceo/users"
              : currentUser?.role === "report_manager"
                ? "/users"
                : "/users";
      setTimeout(() => {
        router.push(redirectPath as any);
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

  if (!currentUser) {
    return <div className="text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  if (!isTeamLead && !isHod && !isCeo && !isReportManager) {
    return (
      <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
        {t("common.accessDeniedMessage")}
      </div>
    );
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
      <ReportField className="md:col-span-2" label={t("common.company")}>
        <ReportInput
          disabled
          value={activeSelectedCompany ? activeSelectedCompany.name : t("common.company")}
          className="font-semibold text-sky-600 dark:text-sky-400"
        />
        <input type="hidden" {...register("workspaceId")} />
      </ReportField>

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

      {/* 1. Department */}
      {selectedHeaderDept !== "all" && DEPARTMENT_OPTIONS.includes(selectedHeaderDept as any) ? (
        <ReportField className="md:col-span-2" label={t("common.department")}>
          <ReportInput disabled value={t(`departments.${selectedHeaderDept.toLowerCase()}`, selectedHeaderDept)} className="font-semibold text-sky-600 dark:text-sky-400" />
        </ReportField>
      ) : isTeamLead || allowedDepartments.length === 1 ? (
        <ReportField className="md:col-span-2" label={t("common.department")}>
          <ReportInput disabled value={t(`departments.${(allowedDepartments[0] || "Software").toLowerCase()}`, allowedDepartments[0] || "Software")} className="font-semibold text-sky-600 dark:text-sky-400" />
        </ReportField>
      ) : (
        <div className="md:col-span-2 space-y-2">
          <div className="text-sm font-medium text-foreground">{t("users.assignedDepartments")}</div>
          <div className="text-xs text-muted-foreground mb-2">{t("users.selectDepartmentsHelp", "Select one or more primary departments for this user.")}</div>
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
                  {t(`departments.${deptName.toLowerCase()}`, deptName)}
                </Button>
              );
            })}
            {allowedDepartments.length === 0 && (
              <div className="text-sm text-muted-foreground col-span-2 sm:col-span-4">{t("common.noData")}</div>
            )}
          </div>

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
      )}

      {/* 2. Role */}
      {!isTeamLead ? (
        <ReportField label={t("common.role")} error={errors.role?.message}>
          <ReportSelect {...register("role")}>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`) || CREATE_USER_ROLE_LABELS[role as keyof typeof CREATE_USER_ROLE_LABELS]}
              </option>
            ))}
          </ReportSelect>
        </ReportField>
      ) : (
        <div className="md:col-span-2 rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          {t("users.roleFixedTeamLead", "Role is fixed to Team Member for team lead-created users.")}
        </div>
      )}

      {/* 3. Manager */}
      {isTeamLead ? null : selectedRole === "hod" ? (
        <div className="md:col-span-2 rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          {t("users.autoManagerCeo")}
        </div>
      ) : isHod && (selectedRole === "team_lead" || selectedRole === "report_manager") ? (
        <div className="md:col-span-2 rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          {t("users.autoManagerHod", { name: currentUser.name })}
        </div>
      ) : isReportManager && selectedRole === "team_lead" ? (
        <div className="md:col-span-2 rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          {t("users.autoManagerRm", { name: currentUser.name })}
        </div>
      ) : (
        <ReportField className="md:col-span-2" label={selectedRole === "team_member" ? `${t("roles.team_lead")} (${t("common.manager")})` : selectedRole === "team_lead" || selectedRole === "report_manager" ? `${t("roles.hod")} (${t("common.manager")})` : t("common.manager")} required error={errors.managerName?.message}>
          <ReportSelect {...register("managerName")}>
            <option value="">{selectedRole === "team_member" ? t("users.selectManager") : selectedRole === "team_lead" || selectedRole === "report_manager" ? t("users.selectManager") : t("users.selectManager")}</option>
            {managerSelectOptions.map((manager, idx) => (
              <option key={`${manager._id}-${idx}`} value={manager.name}>
                {manager.name}
              </option>
            ))}
          </ReportSelect>
        </ReportField>
      )}

      {/* 4. Team Type */}
      {selectedRole !== "hod" && selectedRole !== "report_manager" ? (
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

      {/* 5. Skills */}
      {selectedRole !== "hod" && selectedRole !== "report_manager" ? (
        <div className="md:col-span-2">
          <Controller
            control={control}
            name="roleTypes"
            render={({ field }) => (
              <ReportMultiSelectCards
                label={t("users.skills")}
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

      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}

      <div className="md:col-span-2 flex justify-end">
        <Button className="w-fit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("common.creating") : t("users.addEmployee")}
        </Button>
      </div>
    </form>
  );
}
