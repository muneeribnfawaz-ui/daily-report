import { z } from "zod";
import { AUTH_ROLE_OPTIONS, LEAVE_DURATION_OPTIONS, LEAVE_HALF_OPTIONS, LEAVE_TYPE_OPTIONS, SOFTWARE_ROLE_OPTIONS } from "@/lib/constants";
import { getLeaveRequestDateWindow, parseDateInputValue } from "@/lib/date-utils";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(AUTH_ROLE_OPTIONS),
  teamName: z.string().min(1)
});

export const adminCreateReportManagerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  teamName: z.string().min(1)
});

export const adminCreateUserSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(7),
  empID: z.string().min(2),
  role: z.enum(AUTH_ROLE_OPTIONS),
  roleTypes: z.array(z.enum(SOFTWARE_ROLE_OPTIONS)).default([]),
  teamNames: z.array(z.string().min(1)).min(1),
  managerName: z.string().min(1, "Select a manager"),
  email: z.string().email(),
  password: z.string().min(8)
}).superRefine((data, ctx) => {
  if (data.role !== "report_manager" && data.roleTypes.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roleTypes"],
      message: "Select at least one role type"
    });
  }
});

export const adminUpdateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  empID: z.string().min(2).optional(),
  role: z.enum(AUTH_ROLE_OPTIONS).optional(),
  roleTypes: z.array(z.enum(SOFTWARE_ROLE_OPTIONS)).optional(),
  teamNames: z.array(z.string().min(1)).min(1).optional(),
  managerName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  resetPassword: z.boolean().optional(),
  newPassword: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().min(8).optional()),
  confirmPassword: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().min(8).optional()),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  isActive: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  isAdminActive: z.boolean().optional(),
  isEmailActivated: z.boolean().optional()
}).superRefine((data, ctx) => {
  if (data.role && data.role !== "report_manager" && data.roleTypes && data.roleTypes.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["roleTypes"],
      message: "Select at least one role type"
    });
  }

  if (data.resetPassword) {
    if (!data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Enter a new password"
      });
    }

    if (!data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Confirm the new password"
      });
    }

    if (data.newPassword && data.confirmPassword && data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match"
      });
    }
  }
});

export const profileUpdateSchema = z.object({
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
  }, z.string().min(7, "Second mobile number must be at least 7 digits").optional()),
  oldPassword: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().min(8).optional()),
  newPassword: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().min(8).optional()),
  confirmPassword: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().min(8).optional())
}).superRefine((data, ctx) => {
  const wantsPasswordChange = Boolean(data.oldPassword || data.newPassword || data.confirmPassword);

  if (wantsPasswordChange) {
    if (!data.oldPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["oldPassword"],
        message: "Enter your current password"
      });
    }

    if (!data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Enter a new password"
      });
    }

    if (!data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Confirm the new password"
      });
    }

    if (data.newPassword && data.confirmPassword && data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match"
      });
    }
  }
});

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

const DAILY_REPORT_TYPES = ["Daily Update", "Bug Fix", "Meeting Notes", "Blocker", "Attendance", "Other"] as const;

export const dailyReportSchema = z.object({
  teamName: z.union([z.string().min(1), z.literal("")]).optional(),
  reportType: z.union([z.enum(DAILY_REPORT_TYPES), z.literal("")]).optional(),
  reportDate: z.union([z.string().min(1), z.literal("")]).optional(),
  attachmentLink: z.union([z.string().url(), z.literal("")]).optional(),
  dailyMeetingUpdate: z.union([z.string(), z.literal("")]).optional(),
  completedWork: z.string().min(2, "Completed work is required"),
  pendingWork: z.union([z.string(), z.literal("")]).optional(),
  blockers: z.union([z.string(), z.literal("")]).optional(),
  requiredClarification: z.union([z.string(), z.literal("")]).optional()
});

export const leaveRequestSchema = z.object({
  leaveType: z.enum(LEAVE_TYPE_OPTIONS, {
    error: "Leave type is required"
  }),
  leaveDuration: z.enum(LEAVE_DURATION_OPTIONS, {
    error: "Leave duration is required"
  }),
  leaveHalf: z.preprocess((value) => {
    if (value === "") return undefined;
    return value;
  }, z.enum(LEAVE_HALF_OPTIONS).optional()),
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  reason: z.string().min(5, "Reason is required")
}).superRefine((data, ctx) => {
  const { startDate, endDate } = getLeaveRequestDateWindow();
  const fromDate = parseDateInputValue(data.fromDate);
  const toDate = parseDateInputValue(data.toDate);
  const fromTime = fromDate.getTime();
  const toTime = toDate.getTime();
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  if (Number.isNaN(fromTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fromDate"],
      message: "From date is required"
    });
  }

  if (Number.isNaN(toTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toDate"],
      message: "To date is required"
    });
  }

  if (!Number.isNaN(fromTime) && (fromTime < startTime || fromTime > endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fromDate"],
      message: "Leave requests can only be submitted from this month through the next 2 months"
    });
  }

  if (!Number.isNaN(toTime) && (toTime < startTime || toTime > endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toDate"],
      message: "Leave requests can only be submitted from this month through the next 2 months"
    });
  }

  if (!Number.isNaN(fromTime) && !Number.isNaN(toTime) && fromTime > toTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toDate"],
      message: "To date must be on or after from date"
    });
  }

  if (data.leaveDuration === "half_day" && !Number.isNaN(fromTime) && !Number.isNaN(toTime) && fromTime !== toTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toDate"],
      message: "Half day leave must use the same from and to date"
    });
  }

  if (data.leaveDuration === "half_day" && !data.leaveHalf) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["leaveHalf"],
      message: "Select whether this is the first half or second half"
    });
  }

  if (data.leaveDuration === "full_day" && data.leaveHalf) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["leaveHalf"],
      message: "Half-day selection is only allowed for half day leave"
    });
  }
});

export const consolidatedReportSchema = z.object({
  title: z.string().min(3),
  reportDate: z.string().min(1),
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  teamNames: z.array(z.string().min(1)).min(1),
  remarks: z.string().optional().default("")
});

export const unlockReportSchema = z.object({
  reason: z.string().min(10)
});
