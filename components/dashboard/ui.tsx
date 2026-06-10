import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">{eyebrow}</div> : null}
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground lg:text-base">{description}</p>
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
        <div className="text-xs text-muted-foreground">Updated moments ago</div>
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
