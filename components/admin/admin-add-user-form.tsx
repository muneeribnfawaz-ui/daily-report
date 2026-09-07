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

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/hooks/use-session";

type AdminUserValues = z.infer<typeof clientCreateUserSchema>;

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: teamTypes } = useQuery<TeamTypeOption[]>({
    queryKey: ["team-types", "admin-create-user"],
    queryFn: async () => {
      const response = await api.get("/api/admin/team-types", { params: { department: "all" } });
      return (response.data?.data ?? []) as TeamTypeOption[];
    },
    staleTime: 0
  });

  const { data: companies } = useQuery<CompanyOption[]>({
    queryKey: ["header-active-companies"],
    queryFn: async () => {
      const response = await api.get("/api/companies");
      return response.data?.data as CompanyOption[];
    }
  });
  const teamOptions = useMemo(
    () => teamTypes ?? [],
    [teamTypes]
  );

  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const activeSelectedCompany = useMemo(() => {
    if (!companies || companies.length === 0) return null;
    if (selectedCompanyId && selectedCompanyId !== "all") {
      const found = companies.find((c) => c._id === selectedCompanyId);
      if (found) return found;
    }
    return companies[0];
  }, [companies, selectedCompanyId]);

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

  const managerSelectOptions = useMemo(() => {
    if (selectedRole === "hod") return [{ _id: "admin", name: "Admin" }];
    if (selectedRole === "team_lead" || selectedRole === "report_manager") return hodOptions;
    if (selectedRole === "team_member") return teamLeadOptions;
    return teamLeadOptions;
  }, [hodOptions, selectedRole, teamLeadOptions]);

  const selectedDepartmentNames = useMemo(
    () => currentDepartments.map((d) => d.name),
    [currentDepartments]
  );

  const availableSkills = useMemo(
    () => getSkillsForDepartments(selectedDepartmentNames),
    [selectedDepartmentNames]
  );

  const availableTeamOptions = useMemo(() => {
    if (selectedRole === "ceo" || selectedRole === "hod" || selectedRole === "report_manager") return [];

    if (selectedDepartmentNames.length > 0) {
      return teamOptions.filter((team) => team.department && selectedDepartmentNames.includes(team.department as any));
    }
    return [];
  }, [selectedRole, teamOptions, selectedDepartmentNames]);

  const sessionUserRole = sessionUser?.role;
  const sessionUserName = sessionUser?.name;
  const activeCompanyId = activeSelectedCompany?._id;

  useEffect(() => {
    if (activeCompanyId) {
      setValue("workspaceId", activeCompanyId);
    }
  }, [activeCompanyId, setValue]);

  useEffect(() => {
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
        if (currentManagerName !== ceoManager) {
          setValue("managerName", ceoManager);
        }
      }
      return;
    }

    if (!currentRoleTypes?.length && selectedDepartmentNames.length > 0 && availableSkills.length > 0) {
      setValue("roleTypes", [availableSkills[0].name as any]);
    }

    if (selectedRole === "team_lead") {
      if (currentManagerName && !hodOptions.some((manager) => manager.name === currentManagerName)) {
        setValue("managerName", "");
      }
    } else if (selectedRole === "team_member") {
      if (currentManagerName && !managerSelectOptions.some((manager) => manager.name === currentManagerName)) {
        setValue("managerName", "");
      }
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
    hodOptions,
    managerSelectOptions,
    setValue
  ]);

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

  const onSubmit = async (values: AdminUserValues) => {
    setError(null);
    setMessage(null);

    const resolvedManagerName = values.managerName;

    try {
      await api.post("/api/admin/users", {
        ...values,
        managerName: resolvedManagerName
      });
      reset({
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
      });
      setMessage("User created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      if (values.role === "ceo") {
        router.push("/admin/users?role=ceo");
        return;
      }
    } catch (requestError) {
      const responseMessage = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
      setError(responseMessage ?? "Failed to create user.");
    }
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
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
            pass = pass.split('').sort(() => 0.5 - Math.random()).join('');
            setValue("password", pass, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            setValue("confirmPassword", pass, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            clearErrors(["password", "confirmPassword"]);
          }}
          className="text-xs h-8"
        >
          Suggest Strong Password
        </Button>
      </div>

      {sessionUser?.role === "ceo" ? (
        <ReportField className="md:col-span-2" label="Company">
          <input type="hidden" {...register("workspaceId")} />
          <div className="flex h-11 w-full items-center rounded-xl border border-input bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
            {activeSelectedCompany ? activeSelectedCompany.name : "Loading company..."}
          </div>
        </ReportField>
      ) : selectedRole !== "ceo" ? (
        <ReportField className="md:col-span-2" label="Company" required error={errors.workspaceId?.message}>
          <ReportSelect {...register("workspaceId")}>
            <option value="">Select Company</option>
            {companies?.map((company) => (
              <option key={company._id} value={company._id}>
                {company.name} {company.type === "ceo" ? "(CEO Workspace)" : "(Company Workspace)"}
              </option>
            ))}
          </ReportSelect>
        </ReportField>
      ) : null}

      {/* 2. Department */}
      {selectedRole !== "ceo" ? (
        <div className="md:col-span-2 space-y-2">
          <div className="text-sm font-medium text-foreground">
            Departments (Assigned to User) <span className="text-danger">*</span>
          </div>
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
          {errors.departments?.message ? (
            <p className="text-xs text-danger font-medium mt-1">{errors.departments.message}</p>
          ) : null}

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
      ) : null}

      {/* 3. Role */}
      {selectedRole !== "ceo" ? (
        <ReportField label="Role" required error={errors.role?.message}>
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
                    {CREATE_USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </ReportSelect>
            )}
          />
        </ReportField>
      ) : null}

      {/* 4. Team Type */}
      {selectedRole !== "ceo" && selectedRole !== "hod" && selectedRole !== "report_manager" ? (
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
                    : selectedRole === "team_lead"
                    ? "Choose at least one team type for this team lead."
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
      ) : null}

      {/* 5. Manager */}
      {selectedRole === "hod" ? (
        <ReportField className="md:col-span-2" label="Manager">
          <input type="hidden" {...register("managerName")} />
          <div className="flex h-11 w-full items-center rounded-xl border border-input bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
            {sessionUser?.role === "ceo" ? sessionUser.name : "CEO"}
          </div>
        </ReportField>
      ) : selectedRole !== "ceo" && selectedRole !== "admin" ? (
        <ReportField className="md:col-span-2" label={selectedRole === "team_member" ? "Team Lead" : selectedRole === "report_manager" || selectedRole === "team_lead" ? "HOD (Manager)" : "Manager"} required error={errors.managerName?.message}>
          <ReportSelect {...register("managerName")}>
            <option value="">{selectedRole === "team_member" ? "Select team lead" : "Select HOD"}</option>
            {managerSelectOptions.map((manager) => (
              <option key={manager._id} value={manager.name}>
                {manager.name}
              </option>
            ))}
          </ReportSelect>
        </ReportField>
      ) : null}

      {/* 6. Skills */}
      {selectedRole !== "report_manager" && selectedRole !== "ceo" && selectedRole !== "hod" ? (
        <div className="md:col-span-2">
          <Controller
            control={control}
            name="roleTypes"
            render={({ field }) => (
              <ReportMultiSelectCards
                label="Skills / Specialties"
                required
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
        {isSubmitting ? "Creating..." : selectedRole === "ceo" ? "Create CEO" : "Create Employee"}
      </Button>
    </form>
  );
}
