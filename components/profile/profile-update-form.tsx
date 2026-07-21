"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportField, ReportInput } from "@/components/forms/report-controls";
import { PasswordInput } from "@/components/forms/password-input";
import { ProfileActionButton } from "@/components/profile/profile-action-button";
import { toDateInputValue } from "@/lib/date-utils";
import { ROLE_LABELS, normalizeRole } from "@/lib/constants";

const nameUpdateSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  dateOfBirth: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().min(1).optional()),
  secondaryPhone: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().min(7, "Alternate mobile number must be at least 7 digits").optional())
});

const passwordUpdateSchema = z.object({
  oldPassword: z.string().min(5, "Enter your current password"),
  newPassword: z.string().min(5, "Enter a new password"),
  confirmPassword: z.string().min(5, "Confirm the new password")
}).superRefine((data, ctx) => {
  if (data.newPassword !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match"
    });
  }
});

type NameUpdateValues = z.infer<typeof nameUpdateSchema>;
type PasswordUpdateValues = z.infer<typeof passwordUpdateSchema>;

const readOnlyInputClassName = "text-textPrimary placeholder:text-textSecondary disabled:text-textPrimary disabled:opacity-100";
const editableInputClassName = "text-textPrimary placeholder:text-textSecondary";

type ProfileData = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  secondaryPhone?: string;
  name?: string;
  email?: string;
  empID?: string;
  teamName?: string;
  teamNames?: string[];
  managerName?: string;
  status?: string;
  createdAt?: string;
  leftAt?: string;
  role?: string;
  phone?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  isAdminActive?: boolean;
  isEmailActivated?: boolean;
};

function renderDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

function renderLeftAt(value?: string | null) {
  if (!value) return "Currently working here";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Currently working here";
  return date.toLocaleDateString();
}

function normalizeDateFieldValue(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return toDateInputValue(parsedDate);
}

function renderValue(value?: string | number | boolean | null) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function humanizeLabel(value?: string | null) {
  if (!value) return "N/A";
  return value
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function capitalizeFirst(value?: string | null) {
  if (!value) return "N/A";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function activeStatusLabel(value?: boolean | null) {
  if (value === null || value === undefined) return "N/A";
  return value ? "Active" : "Inactive";
}

export function ProfileUpdateForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [activeProfile, setActiveProfile] = useState<ProfileData>(profile);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isNameSubmitting, setIsNameSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const nameInitialValues = useMemo(
    () => ({
      firstName: activeProfile.firstName ?? "",
      lastName: activeProfile.lastName ?? "",
      dateOfBirth: normalizeDateFieldValue(activeProfile.dateOfBirth),
      secondaryPhone: activeProfile.secondaryPhone ?? ""
    }),
    [activeProfile.dateOfBirth, activeProfile.firstName, activeProfile.lastName, activeProfile.secondaryPhone]
  );

  const passwordInitialValues = useMemo(
    () => ({
      oldPassword: "",
      newPassword: "",
      confirmPassword: ""
    }),
    []
  );

  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
    reset: resetName,
    setError: setNameFieldError,
    clearErrors: clearNameErrors,
    formState: { errors: nameErrors, isDirty: isNameDirty }
  } = useForm<NameUpdateValues>({
    defaultValues: nameInitialValues
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    setError: setPasswordFieldError,
    clearErrors: clearPasswordErrors,
    formState: { errors: passwordErrors }
  } = useForm<PasswordUpdateValues>({
    defaultValues: passwordInitialValues
  });

  useEffect(() => {
    resetName(nameInitialValues);
  }, [nameInitialValues, resetName]);

  useEffect(() => {
    setActiveProfile(profile);
  }, [profile]);

  useEffect(() => {
    resetPassword(passwordInitialValues);
  }, [passwordInitialValues, resetPassword]);

  const submitProfileUpdate = async (payload: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    secondaryPhone?: string;
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }) => {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responsePayload = await response.json();
    if (!response.ok || !responsePayload?.success) {
      throw new Error(responsePayload?.message ?? "Failed to update profile.");
    }

    return responsePayload;
  };

  const onNameSubmit = async (values: NameUpdateValues) => {
    setNameError(null);
    setNameMessage(null);
    clearNameErrors();

    if (!isNameDirty) {
      setNameError("Make a change before saving.");
      return;
    }

    const parsed = nameUpdateSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        if (
          fieldName === "firstName" ||
          fieldName === "lastName" ||
          fieldName === "dateOfBirth" ||
          fieldName === "secondaryPhone"
        ) {
          setNameFieldError(fieldName, {
            type: "manual",
            message: issue.message
          });
        }
      });
      return;
    }

    setIsNameSubmitting(true);

    try {
      const payload = await submitProfileUpdate({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        dateOfBirth: parsed.data.dateOfBirth,
        secondaryPhone: parsed.data.secondaryPhone
      });

      setNameMessage("Profile updated successfully.");
      setActiveProfile((current) => ({
        ...current,
        firstName: payload.data?.firstName ?? current.firstName,
        lastName: payload.data?.lastName ?? current.lastName,
        dateOfBirth: payload.data?.dateOfBirth ?? current.dateOfBirth,
        secondaryPhone: payload.data?.secondaryPhone ?? current.secondaryPhone,
        name: payload.data?.name ?? current.name,
        managerName: payload.data?.managerName ?? current.managerName
      }));
      resetName({
        firstName: payload.data?.firstName ?? "",
        lastName: payload.data?.lastName ?? "",
        dateOfBirth: normalizeDateFieldValue(payload.data?.dateOfBirth),
        secondaryPhone: payload.data?.secondaryPhone ?? ""
      });
      router.refresh();
    } catch (requestError) {
      setNameError(requestError instanceof Error ? requestError.message : "Failed to update profile.");
    } finally {
      setIsNameSubmitting(false);
    }
  };

  const onPasswordSubmit = async (values: PasswordUpdateValues) => {
    setPasswordError(null);
    setPasswordMessage(null);
    clearPasswordErrors();

    const parsed = passwordUpdateSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        if (fieldName === "oldPassword" || fieldName === "newPassword" || fieldName === "confirmPassword") {
          setPasswordFieldError(fieldName, {
            type: "manual",
            message: issue.message
          });
        }
      });
      return;
    }

    setIsPasswordSubmitting(true);

    try {
      await submitProfileUpdate({
        firstName: activeProfile.firstName ?? "",
        lastName: activeProfile.lastName ?? "",
        dateOfBirth: normalizeDateFieldValue(activeProfile.dateOfBirth),
        secondaryPhone: activeProfile.secondaryPhone ?? "",
        oldPassword: parsed.data.oldPassword,
        newPassword: parsed.data.newPassword,
        confirmPassword: parsed.data.confirmPassword
      });

      setPasswordMessage("Password updated successfully.");
      resetPassword(passwordInitialValues);
      router.refresh();
    } catch (requestError) {
      setPasswordError(requestError instanceof Error ? requestError.message : "Failed to update password.");
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const roleLabel = ROLE_LABELS[normalizeRole(profile.role) ?? "team_member"];
  const teamLabel = humanizeLabel(activeProfile.teamName ?? (activeProfile.teamNames?.length ? activeProfile.teamNames.join(" · ") : null));
  const teamLeadLabel = humanizeLabel(activeProfile.managerName ?? null);
  const statusLabel = activeStatusLabel(activeProfile.isActive);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-textSecondary">Workspace</div>
        <h1 className="text-xl font-semibold tracking-tight text-textPrimary sm:text-2xl">Profile</h1>
        <p className="max-w-2xl text-sm text-textSecondary">
          View your account details on the left and manage the editable fields on the right.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="min-w-0 overflow-hidden shadow-soft">
          <CardHeader className="border-b border-border bg-card px-4 py-5 sm:px-6">
            <CardTitle className="text-lg text-textPrimary sm:text-xl">Official details</CardTitle>
          </CardHeader>
          <div className="border-t border-border px-4 py-5 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <ReportField label="Email">
                <ReportInput className={readOnlyInputClassName} disabled value={renderValue(activeProfile.email)} />
              </ReportField>
              <ReportField label="EmpID">
                <ReportInput className={readOnlyInputClassName} disabled value={renderValue(activeProfile.empID)} />
              </ReportField>
              <ReportField label="Team">
                <ReportInput className={readOnlyInputClassName} disabled value={teamLabel} />
              </ReportField>
              <ReportField label="Team Lead">
                <ReportInput className={readOnlyInputClassName} disabled value={teamLeadLabel} />
              </ReportField>
              <ReportField label="Status">
                <ReportInput className={readOnlyInputClassName} disabled value={statusLabel} />
              </ReportField>
              <ReportField label="Joining date">
                <ReportInput className={readOnlyInputClassName} disabled value={renderDate(activeProfile.createdAt)} />
              </ReportField>
              <ReportField label="Date of birth">
                <ReportInput className={readOnlyInputClassName} disabled value={renderDate(activeProfile.dateOfBirth)} />
              </ReportField>
              <ReportField label="Leaved on">
                <ReportInput
                  className={readOnlyInputClassName}
                  disabled
                  value={renderLeftAt(activeProfile.leftAt)}
                />
              </ReportField>
              <ReportField label="Role">
                <ReportInput className={readOnlyInputClassName} disabled value={roleLabel} />
              </ReportField>
              <ReportField label="Phone">
                <ReportInput className={readOnlyInputClassName} disabled value={renderValue(activeProfile.phone)} />
              </ReportField>
            </div>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card className="shadow-soft">
            <CardHeader className="border-b border-border bg-card px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <CardTitle className="text-lg text-textPrimary sm:text-xl">Personal details</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-5 sm:px-6 sm:pt-6">
              <form className="space-y-4" onSubmit={handleNameSubmit(onNameSubmit)}>
                <ReportField label="First name" error={nameErrors.firstName?.message}>
                  <ReportInput className={editableInputClassName} placeholder="First name" {...registerName("firstName")} />
                </ReportField>
                <ReportField label="Last name" error={nameErrors.lastName?.message}>
                  <ReportInput className={editableInputClassName} placeholder="Last name" {...registerName("lastName")} />
                </ReportField>
                <ReportField label="Date of birth" error={nameErrors.dateOfBirth?.message}>
                  <ReportInput className={editableInputClassName} type="date" {...registerName("dateOfBirth")} />
                </ReportField>
                <ReportField label="Alternate mobile number" error={nameErrors.secondaryPhone?.message}>
                  <ReportInput className={editableInputClassName} placeholder="optional" {...registerName("secondaryPhone")} />
                </ReportField>

                {nameError ? <p className="text-sm text-danger">{nameError}</p> : null}
                {nameMessage ? <p className="text-sm text-success">{nameMessage}</p> : null}

                <ProfileActionButton type="submit" className="w-full sm:w-auto" isLoading={isNameSubmitting} loadingText="Saving...">
                  Save change
                </ProfileActionButton>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="border-b border-border bg-card px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <CardTitle className="text-lg text-textPrimary sm:text-xl">Reset password</CardTitle>
                  <p className="text-sm text-textSecondary">Enter your current password, then set a new one.</p>
                </div>
                <Badge variant="outline" className="self-start rounded-full border-border bg-muted text-textSecondary">
                  secure update
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pt-5 sm:px-6 sm:pt-6">
              <form className="space-y-4" onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                <ReportField label="Current password" error={passwordErrors.oldPassword?.message}>
                  <PasswordInput
                    variant="report"
                    className={editableInputClassName}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    {...registerPassword("oldPassword")}
                  />
                </ReportField>
                <div className="grid gap-4 md:grid-cols-2">
                  <ReportField label="New password" error={passwordErrors.newPassword?.message}>
                    <PasswordInput
                      variant="report"
                      className={editableInputClassName}
                      placeholder="New password"
                      autoComplete="new-password"
                      {...registerPassword("newPassword")}
                    />
                  </ReportField>
                  <ReportField label="Confirm new password" error={passwordErrors.confirmPassword?.message}>
                    <PasswordInput
                      variant="report"
                      className={editableInputClassName}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      {...registerPassword("confirmPassword")}
                    />
                  </ReportField>
                </div>

                {passwordError ? <p className="text-sm text-danger">{passwordError}</p> : null}
                {passwordMessage ? <p className="text-sm text-success">{passwordMessage}</p> : null}

                <ProfileActionButton type="submit" className="w-full sm:w-auto" isLoading={isPasswordSubmitting} loadingText="Saving...">
                  Change password
                </ProfileActionButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
