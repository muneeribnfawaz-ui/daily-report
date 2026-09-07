"use client";

import axios from "axios";
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
import type { SessionUser } from "@/lib/types";

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
  teamName?: string | null;
  teamNames?: string[] | null;
  departments?: Array<{ name: string; subTeams: string[] }> | null;
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

  const { data: teamTypes } = useQuery<TeamTypeOption[]>({
    queryKey: ["team-types"],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get("/api/team-types", { params: { department: "all" } });
      return (response.data?.data ?? []) as TeamTypeOption[];
    },
    staleTime: 0
  });

  const { data: teamLeadOptions = [] } = useQuery<ManagerOption[]>({
    queryKey: ["team-leads-for-create", currentUser?.role, currentUser?.name],
    enabled: Boolean(currentUser) && currentUser?.role !== "team_lead",
    queryFn: async () => {
      const response = await api.get("/api/report-manager/users", { params: { role: "team_lead" } });
      return response.data?.data as ManagerOption[];
    },
    staleTime: 60_000
  });

  const { data: hodOptions = [] } = useQuery<ManagerOption[]>({
    queryKey: ["hods-for-create", currentUser?.role],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get("/api/admin/users", { params: { role: "hod" } });
      return response.data?.data as ManagerOption[];
    },
    staleTime: 60_000
  });

  const { data: rmOptions = [] } = useQuery<ManagerOption[]>({
    queryKey: ["rms-for-create", currentUser?.role],
    enabled: Boolean(currentUser),
    queryFn: async () => {
      const response = await api.get("/api/admin/users", { params: { role: "report_manager" } });
      return response.data?.data as ManagerOption[];
    },
    staleTime: 60_000
  });

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


  const activeCompanyId = activeSelectedCompany?._id ?? currentUser?.workspaceId ?? (selectedCompanyId !== "all" ? selectedCompanyId : "");

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

  const availableTeamOptions = useMemo(() => {
    if (selectedRole === "hod" || selectedRole === "report_manager") {
      return [];
    }

    let teams = teamOptions;
    if (isTeamLead) {
      const allowedTeamNames = currentUser?.teamNames ?? [];
      const allowedTeamName = currentUser?.teamName;
      const allAllowed = [...allowedTeamNames];
      if (allowedTeamName && !allAllowed.includes(allowedTeamName)) {
        allAllowed.push(allowedTeamName);
      }
      
      const finalAllowed = allAllowed;

      if (finalAllowed.length) {
        const normalizedAllowed = finalAllowed.map((t) => t.trim().toLowerCase());
        const filtered = teamOptions.filter(
          (team) =>
            normalizedAllowed.includes(team.name.trim().toLowerCase()) ||
            (team.showName && normalizedAllowed.includes(team.showName.trim().toLowerCase()))
        );
        if (filtered.length > 0) {
          teams = filtered;
        } else {
          teams = finalAllowed.map((name) => ({
            _id: name,
            name: name,
            showName: name
          }));
        }
      } else {
        teams = [];
      }
    }

    if (selectedDepartmentNames.length > 0) {
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
  }, [currentUser?.teamName, currentUser?.teamNames, isTeamLead, selectedDepartmentNames, selectedRole, teamOptions, selectedHeaderDept]);


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

  const managerSelectOptions = useMemo(() => {
    let options: ManagerOption[] = [];
    if (isTeamLead) return [];

    if (selectedRole === "hod") {
      if (isCeo && currentUser) {
        options = [{ _id: currentUser.id, name: currentUser.name || currentUser.email }];
      }
    } else if (selectedRole === "report_manager") {
      options = hodOptions;
    } else if (selectedRole === "team_lead") {
      options = rmOptions.length > 0 ? rmOptions : hodOptions;
    } else if (selectedRole === "team_member") {
      if (selectedDepartmentNames.length > 0) {
        const filtered = teamLeadOptions.filter((manager) => {
          if (!manager.departments || manager.departments.length === 0) return true;
          return manager.departments.some((d: any) => selectedDepartmentNames.includes(d.name));
        });
        if (filtered.length > 0) options = filtered;
        else options = teamLeadOptions;
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
  }, [currentUser, hodOptions, isCeo, isTeamLead, rmOptions, selectedDepartmentNames, selectedRole, teamLeadOptions]);

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
    if (isTeamLead) return;
    if (!currentUser) return;

    if (selectedRole === "team_member") {
      if (currentManagerName && managerSelectOptions.some((manager) => manager.name === currentManagerName)) {
        return;
      }
      const firstValidTeamLead = managerSelectOptions[0]?.name ?? "";
      if (firstValidTeamLead && currentManagerName !== firstValidTeamLead) {
        setValue("managerName", firstValidTeamLead);
      }
    } else if (selectedRole === "hod") {
      const ceoName = isCeo ? (currentUser.name || currentUser.email) : "CEO";
      if (currentManagerName !== ceoName) {
        setValue("managerName", ceoName);
      }
    } else if (selectedRole === "report_manager" || selectedRole === "team_lead") {
      if (currentManagerName && managerSelectOptions.some((manager) => manager.name === currentManagerName)) {
        return;
      }
      const firstValidManager = managerSelectOptions[0]?.name ?? "";
      if (firstValidManager && currentManagerName !== firstValidManager) {
        setValue("managerName", firstValidManager);
      }
    }
  }, [currentManagerName, currentUser, isCeo, isTeamLead, managerSelectOptions, selectedRole, setValue]);

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
    if (selectedRole === "hod" || selectedRole === "report_manager") {
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
      availableTeamOptions.some((team) => team.name === teamName)
    ) ?? [];

    if (!validTeamNames.length) {
      setValue("teamNames", [availableTeamOptions[0].name]);
    } else if (!sameStringList(validTeamNames, currentTeamNames)) {
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
      isTeamLead
        ? currentUserTeamNames.length
          ? values.teamNames.filter((teamName) => currentUserTeamNames.includes(teamName))
          : values.teamNames
        : values.teamNames;

    const resolvedWorkspaceId =
      values.workspaceId && values.workspaceId.trim() !== ""
        ? values.workspaceId
        : activeCompanyId || (currentUser as any)?.workspaceId || (currentUser as any)?.companyWorkspace || "";

    const payload: CreateUserValues = {
      ...values,
      workspaceId: resolvedWorkspaceId,
      managerName: isTeamLead ? currentUser?.name ?? values.managerName : values.managerName,
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
      setMessage("User created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/report-manager/users"] });
    } catch (requestError) {
      const responseMessage = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
      setError(responseMessage ?? "Failed to create user.");
    }
  };

  if (!currentUser) {
    return <div className="text-sm text-muted-foreground">Loading user session...</div>;
  }

  if (!isTeamLead && !isHod && !isCeo && !isReportManager) {
    return (
      <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
        You do not have permission to create employees.
      </div>
    );
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>

      <ReportField className="md:col-span-2" label="Company">
        <ReportInput
          disabled
          value={activeSelectedCompany ? activeSelectedCompany.name : "Company Workspace"}
          className="font-semibold text-sky-600 dark:text-sky-400"
        />
        <input type="hidden" {...register("workspaceId")} />
      </ReportField>

      <ReportField label="First name" required error={errors.firstName?.message}>
        <ReportInput
          placeholder="First name"
          autoComplete="off"
          data-lpignore="true"
          {...register("firstName")}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
            setValue("firstName", cleaned, { shouldValidate: true, shouldDirty: true });
          }}
        />
      </ReportField>

      <ReportField label="Last name" error={errors.lastName?.message}>
        <ReportInput
          placeholder="Last name"
          autoComplete="off"
          data-lpignore="true"
          {...register("lastName")}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
            setValue("lastName", cleaned, { shouldValidate: true, shouldDirty: true });
          }}
        />
      </ReportField>

      <ReportField label="Phone" required error={errors.phone?.message}>
        <ReportInput
          placeholder="Phone"
          type="tel"
          maxLength={10}
          {...register("phone")}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
            setValue("phone", cleaned, { shouldValidate: true, shouldDirty: true });
          }}
        />
      </ReportField>

      <ReportField label="Employee ID" required error={errors.empID?.message}>
        <ReportInput placeholder="Employee ID" {...register("empID")} />
      </ReportField>

      <ReportField label="Email" required error={errors.email?.message}>
        <ReportInput placeholder="Email" type="email" {...register("email")} />
      </ReportField>

      <ReportField label="Password" required error={errors.password?.message}>
        <PasswordInput variant="report" showRules={true} placeholder="Password" {...register("password")} />
      </ReportField>

      <ReportField label="Confirm Password" required error={errors.confirmPassword?.message}>
        <PasswordInput variant="report" placeholder="Confirm Password" {...register("confirmPassword")} />
      </ReportField>

      <div className="md:col-span-2 flex justify-end">
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
            setValue("password", pass, { shouldValidate: true, shouldDirty: true });
            setValue("confirmPassword", pass, { shouldValidate: true, shouldDirty: true });
          }}
        >
          Generate Strong Password
        </Button>
      </div>

      {/* 1. Department */}
      {selectedHeaderDept !== "all" && DEPARTMENT_OPTIONS.includes(selectedHeaderDept as any) ? (
        <ReportField className="md:col-span-2" label="Department">
          <ReportInput disabled value={selectedHeaderDept} className="font-semibold text-sky-600 dark:text-sky-400" />
        </ReportField>
      ) : isTeamLead || allowedDepartments.length === 1 ? (
        <ReportField className="md:col-span-2" label="Department">
          <ReportInput disabled value={allowedDepartments[0] || "Software"} className="font-semibold text-sky-600 dark:text-sky-400" />
        </ReportField>
      ) : (
        <div className="md:col-span-2 space-y-2">
          <div className="text-sm font-medium text-foreground">Departments (Assigned to User)</div>
          <div className="text-xs text-muted-foreground mb-2">Select one or more primary departments for this user.</div>
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
                  {deptName}
                </Button>
              );
            })}
            {allowedDepartments.length === 0 && (
              <div className="text-sm text-muted-foreground col-span-2 sm:col-span-4">No departments available.</div>
            )}
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
                      variant={isSubSelected ? "default" : "outline"}
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
      )}

      {/* 2. Role */}
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

      {/* 3. Team Type */}
      {selectedRole !== "hod" && selectedRole !== "report_manager" ? (
        isTeamLead ? (
          <div className="md:col-span-2">
            <Controller
              control={control}
              name="teamNames"
              render={({ field }) => (
                <ReportMultiSelectCards
                  label="Team (Team Type)"
                  required
                  helperText="Choose one or more team types from your assigned team list."
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
          <div className="md:col-span-2">
            <Controller
              control={control}
              name="teamNames"
              render={({ field }) => (
                <ReportMultiSelectCards
                  label="Team (Team Type)"
                  required={selectedRole === "team_lead" || selectedRole === "team_member"}
                  helperText={
                    selectedRole === "team_member"
                      ? "Choose at least one team type managed by the selected team lead."
                      : "Choose one or more team types for this user."
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
        )
      ) : null}

      {/* 4. Manager */}
      {isTeamLead ? null : selectedRole === "hod" ? (
        <div className="md:col-span-2 rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          Manager is set automatically to {currentUser.name}.
        </div>
      ) : (
        <ReportField className="md:col-span-2" label="Manager" error={errors.managerName?.message}>
          <ReportSelect {...register("managerName")}>
            <option value="">Select Manager</option>
            {managerSelectOptions.map((manager, idx) => (
              <option key={`${manager._id}-${idx}`} value={manager.name}>
                {manager.name}
              </option>
            ))}
          </ReportSelect>
        </ReportField>
      )}

      {/* 5. Skills */}
      {selectedRole !== "hod" && selectedRole !== "report_manager" ? (
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

      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}

      <Button className="md:col-span-2 w-fit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
