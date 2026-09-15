"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const KNOWN_HEADER_MAP: Record<string, string> = {
  // Eyebrows
  "Access Control": "users.eyebrowAccessControl",
  "ACCESS CONTROL": "users.eyebrowAccessControl",
  "Executive Access": "users.eyebrowAccessControl",
  "Workspace Directory": "companies.eyebrow",
  "Account & Security": "profile.eyebrow",
  "Compliance & Audit": "auditLogs.eyebrow",
  "System Administration": "settings.eyebrow",

  // Titles
  "Add User": "users.addUser",
  "Add Employee": "users.addEmployee",
  "Add CEO": "users.addCeo",
  "Create User": "users.addUser",
  "Create Employee": "users.addEmployee",
  "Edit User": "users.titleEdit",
  "Edit Employee": "users.titleEdit",
  "User Details": "users.titleDetails",
  "Employee Directory": "users.titleList",
  "Users": "users.users",
  "CEOs": "users.ceos",
  "Companies Management": "companies.titleManagement",
  "Create New Company": "companies.titleCreate",
  "Edit Company": "companies.titleEdit",
  "System Settings": "settings.title",
  "Audit Logs": "auditLogs.title",

  // Descriptions
  "Create staff profiles on a dedicated page with role, manager, and software type selection.": "users.addUserPageDesc",
  "Create staff profiles with role, department, and team assignment.": "users.descAdd",
  "Create employee profiles with role, department, and team assignment.": "users.descAdd",
  "Manage employee profiles, role assignments, managers, and team memberships.": "users.descList",
  "Update profile fields, roles, status flags, and manager assignments.": "users.descEdit",
  "Read-only profile view for this user.": "users.descDetails",
  "Create and manage organizations, company profiles, and active statuses across the platform.": "companies.descList",
  "Add a new business organization workspace to the platform.": "companies.descCreate",
  "Modify details, organization code, and active status.": "companies.descEdit",
  "Immutable security records of administrative activities, user modifications, and role updates.": "auditLogs.desc",
  "Configure platform parameters, workspace boundaries, and default operational preferences.": "settings.desc"
};

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions,
  backButton
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  backButton?: ReactNode;
}) {
  const { t } = useTranslation();

  const resolveText = (text?: string) => {
    if (!text) return text;
    if (KNOWN_HEADER_MAP[text]) {
      return t(KNOWN_HEADER_MAP[text], text);
    }
    return t(text, text);
  };

  const resolvedEyebrow = resolveText(eyebrow);
  const resolvedTitle = resolveText(title) || title;
  const resolvedDescription = resolveText(description) || description;

  return (
    <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-start gap-3 md:gap-4">
        {backButton ? <div className="shrink-0 pt-0.5">{backButton}</div> : null}
        <div className="space-y-2">
          {resolvedEyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{resolvedEyebrow}</div> : null}
          <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl text-textPrimary">{resolvedTitle}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground lg:text-base">{resolvedDescription}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function DashboardStatCard({
  label,
  value,
  delta,
  accent = "from-primary/20 via-primary/5 to-transparent",
  tone = "text-foreground"
}: {
  label: string;
  value: string;
  delta?: string;
  accent?: string;
  tone?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-xl border border-cardBorder bg-card p-5 shadow-soft">
      <div className={cn("absolute inset-0 bg-gradient-to-br", accent)} />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className={cn("mt-2 text-3xl font-semibold tracking-tight", tone)}>{value}</div>
          </div>
          {delta ? (
            <div className="rounded-full border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              {delta}
            </div>
          ) : null}
        </div>
        <div className="h-px w-full bg-border/70" />
        <div className="text-xs text-muted-foreground">{t("common.updatedMomentsAgo")}</div>
      </div>
    </div>
  );
}

export function DashboardPanel({
  title,
  subtitle,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-cardBorder bg-card shadow-soft", className)}>
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
