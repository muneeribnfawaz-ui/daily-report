"use client";

import axios from "axios";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import {
  CREATE_USER_ROLE_LABELS,
  CREATE_USER_ROLE_OPTIONS,
  SOFTWARE_ROLE_DESCRIPTIONS,
  SOFTWARE_ROLE_OPTIONS,
  ROLE_LABELS,
  normalizeRole
} from "@/lib/constants";
import { api } from "@/lib/api";
import { adminUpdateUserSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { ReportField, ReportInput, ReportMultiSelectCards, ReportSelect } from "@/components/forms/report-controls";
import { PasswordInput } from "@/components/forms/password-input";

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
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamName?: string | null;
  teamNames?: string[] | null;
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
  teamName?: string;
  teamNames?: string[];
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

export function UserEditForm({
  userId,
  backHref
}: {
  userId: string;
  backHref: string;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
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

  const { data: sessionUser } = useQuery<SessionUser | null>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const response = await api.get("/api/auth/me");
      return (response.data?.data ?? null) as SessionUser | null;
    }
  });

  const currentRole = normalizeRole(sessionUser?.role) ?? null;
  const currentUserTeamNames = useMemo(
    () => normalizeTeamNames(sessionUser?.teamName ?? null, sessionUser?.teamNames ?? null),
    [sessionUser?.teamName, sessionUser?.teamNames]
  );
  const canEditManagerName = currentRole === "admin" || currentRole === "hod" || currentRole === "ceo";
  const canEditRole = currentRole === "admin" || currentRole === "hod" || currentRole === "ceo";
  const canEditEmail = currentRole === "admin" || currentRole === "ceo";
  const canResetPassword = currentRole === "admin" || currentRole === "hod" || currentRole === "ceo";
  const availableTeamOptions = useMemo(() => {
    if (currentRole !== "team_lead") return teamOptions;
    if (!currentUserTeamNames.length) return [];
    return teamOptions.filter((team) => currentUserTeamNames.includes(team.name));
  }, [currentRole, currentUserTeamNames, teamOptions]);

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

  const { data: userData, isLoading, isError } = useQuery<UserRecord>({
    queryKey: ["user-edit", userId],
    queryFn: async () => {
      const response = await api.get(`/api/users/${userId}`);
      return response.data?.data as UserRecord;
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
  } = useForm<UpdateUserValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      empID: "",
      role: undefined,
      roleTypes: [],
      teamNames: [],
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
    reset({
      firstName: userData.firstName ?? "",
      lastName: userData.lastName ?? "",
      phone: userData.phone ?? "",
      empID: userData.empID ?? "",
      role: normalizeRole(userData.role) ?? undefined,
      roleTypes: (userData.roleTypes ?? []) as UpdateUserValues["roleTypes"],
      teamNames: normalizeUserTeamNames(userData) as UpdateUserValues["teamNames"],
      managerName: userData.managerName ?? "",
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
    setShowResetPassword(false);
  }, [reset, userData]);

  const selectedRole = useWatch({ control, name: "role" });
  const currentRoleTypes = useWatch({ control, name: "roleTypes" });
  const currentTeamNames = useWatch({ control, name: "teamNames" });
  const managerName = useWatch({ control, name: "managerName" });
  const resetPasswordEnabled = useWatch({ control, name: "resetPassword" });

  const teamLeadOptions = managerPools?.teamLeads ?? [];
  const hodOptions = managerPools?.hods ?? [];
  const managerSelectOptions = useMemo(() => {
    if (!canEditManagerName) return [];
    if (selectedRole === "hod") return [{ _id: "admin", name: "Admin" }];
    if (selectedRole === "team_lead" || selectedRole === "report_manager") return hodOptions;
    if (selectedRole === "team_member") {
      const selectedTeams = currentTeamNames ?? [];
      if (!selectedTeams.length) return [];
      return teamLeadOptions.filter((manager) => managerMatchesTeams(manager, selectedTeams));
    }
    return teamLeadOptions;
  }, [canEditManagerName, currentTeamNames, hodOptions, selectedRole, teamLeadOptions]);

  useEffect(() => {
    if (!availableTeamOptions.length) return;

    if (!currentTeamNames?.length) {
      setValue("teamNames", [availableTeamOptions[0].name]);
      return;
    }

    if (currentRole !== "team_lead") return;

    const allowedTeamNames = new Set(availableTeamOptions.map((team) => team.name));
    const filteredTeamNames = currentTeamNames.filter((teamName) => allowedTeamNames.has(teamName));
    if (filteredTeamNames.length !== currentTeamNames.length) {
      setValue("teamNames", filteredTeamNames.length ? filteredTeamNames : [availableTeamOptions[0].name]);
    }
  }, [availableTeamOptions, currentRole, currentTeamNames, setValue]);

  useEffect(() => {
    if (!canEditManagerName || selectedRole !== "team_member") return;
    const firstValidManager = managerSelectOptions[0]?.name ?? "";
    if (!firstValidManager) {
      if (managerName) {
        setValue("managerName", "");
      }
      return;
    }

    if (!managerSelectOptions.some((manager) => manager.name === managerName)) {
      setValue("managerName", firstValidManager);
    }
  }, [canEditManagerName, managerName, managerSelectOptions, selectedRole, setValue]);

  const onSubmit = async (values: UpdateUserValues) => {
    setError(null);
    setMessage(null);

    const normalizedTeamNames = Array.from(
      new Set((values.teamNames ?? []).map((teamName) => teamName.trim()).filter(Boolean))
    );
    const resolvedManagerName =
      values.role === "team_member"
        ? managerSelectOptions.find((manager) => manager.name === values.managerName)?.name ?? managerSelectOptions[0]?.name ?? values.managerName
        : values.managerName;

    const payload = {
      ...values,
      email: canEditEmail ? values.email : undefined,
      teamNames: normalizedTeamNames,
      managerName: canEditManagerName ? resolvedManagerName : undefined,
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
      setMessage("User updated successfully.");
    } catch (requestError) {
      const responseMessage = axios.isAxiosError(requestError) ? requestError.response?.data?.message : null;
      setError(responseMessage ?? "Failed to update user.");
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading user...</div>;
  }

  if (isError || !userData) {
    return <div className="text-sm text-danger">Failed to load user.</div>;
  }

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
        {canEditEmail ? (
          <ReportInput placeholder="Email" type="email" {...register("email")} />
        ) : (
          <ReportInput disabled value={userData.email ?? ""} />
        )}
      </ReportField>
      <div className="md:col-span-2">
        <Controller
          control={control}
          name="teamNames"
          render={({ field }) => (
            <ReportMultiSelectCards
              label="Team"
              helperText={selectedRole === "team_member" ? "Choose one or more teams for this user." : "Choose one or more teams for this user."}
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
        {canEditRole ? (
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <ReportSelect
                {...field}
                onChange={(event) => {
                  const nextRole = event.target.value as NonNullable<UpdateUserValues["role"]>;
                  field.onChange(nextRole);

                  if (nextRole === "report_manager") {
                    setValue("roleTypes", []);
                  } else if (!currentRoleTypes?.length) {
                    setValue("roleTypes", [SOFTWARE_ROLE_OPTIONS[0]]);
                  }

                  if (!canEditManagerName) return;

                  if (nextRole === "hod") {
                    setValue("managerName", "Admin");
                    return;
                  }

                  if (nextRole === "team_lead" || nextRole === "report_manager") {
                    const firstHod = hodOptions[0]?.name ?? "";
                    if (firstHod) setValue("managerName", firstHod);
                    return;
                  }

                  const firstTeamLead = teamLeadOptions[0]?.name ?? "";
                  if (firstTeamLead) setValue("managerName", firstTeamLead);
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
        ) : (
          <ReportInput disabled value={ROLE_LABELS[normalizeRole(userData.role) ?? "team_member"]} />
        )}
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
      <div className="md:col-span-2 rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
        List team now follows the manager&apos;s team, while this user keeps its own team assignment here.
      </div>
      <ReportField className="md:col-span-2" label="Manager" error={errors.managerName?.message}>
        {canEditManagerName ? (
          <Controller
            control={control}
            name="managerName"
            render={({ field }) => (
              <ReportSelect {...field}>
                <option value="">{selectedRole === "team_member" ? "Select team lead" : "Select manager"}</option>
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
      <ReportField label="Status" error={errors.status?.message}>
        <ReportSelect {...register("status")}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </ReportSelect>
      </ReportField>
      <ReportField label="Is active" error={errors.isActive?.message}>
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <ReportSelect value={String(field.value)} onChange={(event) => field.onChange(event.target.value === "true")}>
              <option value="true">Is Active: Yes</option>
              <option value="false">Is Active: No</option>
            </ReportSelect>
          )}
        />
      </ReportField>
      <ReportField label="Is deleted" error={errors.isDeleted?.message}>
        <Controller
          control={control}
          name="isDeleted"
          render={({ field }) => (
            <ReportSelect value={String(field.value)} onChange={(event) => field.onChange(event.target.value === "true")}>
              <option value="false">Is Deleted: No</option>
              <option value="true">Is Deleted: Yes</option>
            </ReportSelect>
          )}
        />
      </ReportField>
      <ReportField label="Email activated" error={errors.isEmailActivated?.message}>
        <Controller
          control={control}
          name="isEmailActivated"
          render={({ field }) => (
            <ReportSelect value={String(field.value)} onChange={(event) => field.onChange(event.target.value === "true")}>
              <option value="false">Email Activated: No</option>
              <option value="true">Email Activated: Yes</option>
            </ReportSelect>
          )}
        />
      </ReportField>
      {canEditRole ? (
        <ReportField className="md:col-span-2" label="Admin active" error={errors.isAdminActive?.message}>
          <Controller
            control={control}
            name="isAdminActive"
            render={({ field }) => (
              <ReportSelect value={String(field.value)} onChange={(event) => field.onChange(event.target.value === "true")}>
                <option value="false">Admin Active: No</option>
                <option value="true">Admin Active: Yes</option>
              </ReportSelect>
            )}
          />
        </ReportField>
      ) : null}
      {canResetPassword ? (
        <div className="md:col-span-2 rounded-md border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-foreground">Reset password</div>
              <div className="text-xs text-muted-foreground">Use this only when you want to set a new login password.</div>
            </div>
            <Controller
              control={control}
              name="resetPassword"
              render={({ field }) => (
                <Button
                  type="button"
                  variant={field.value ? "default" : "outline"}
                  onClick={() => {
                    const nextValue = !field.value;
                    field.onChange(nextValue);
                    setShowResetPassword(nextValue);
                    if (!nextValue) {
                      setValue("newPassword", "");
                      setValue("confirmPassword", "");
                    }
                  }}
                >
                  {field.value ? "Password reset enabled" : "Enable password reset"}
                </Button>
              )}
            />
          </div>
          {showResetPassword || resetPasswordEnabled ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ReportField label="New password" error={errors.newPassword?.message}>
                <PasswordInput variant="report" placeholder="New password" {...register("newPassword")} />
              </ReportField>
              <ReportField label="Confirm password" error={errors.confirmPassword?.message}>
                <PasswordInput variant="report" placeholder="Confirm password" {...register("confirmPassword")} />
              </ReportField>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="md:col-span-2 grid gap-2 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div>Created at: {userData.createdAt ? new Date(userData.createdAt).toLocaleString() : "N/A"}</div>
        <div>Updated at: {userData.updatedAt ? new Date(userData.updatedAt).toLocaleString() : "N/A"}</div>
      </div>
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
      {message ? <p className="text-sm text-success md:col-span-2">{message}</p> : null}
      <div className="md:col-span-2 flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update User"}
        </Button>
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
              teamNames: normalizeUserTeamNames(userData) as UpdateUserValues["teamNames"],
              managerName: userData.managerName ?? "",
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
            setShowResetPassword(false);
          }}
        >
          Reset
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href={backHref as any}>Back</Link>
        </Button>
      </div>
    </form>
  );
}
