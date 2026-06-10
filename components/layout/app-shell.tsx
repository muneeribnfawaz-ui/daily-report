"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { ROLE_LABELS, SIDEBAR_NAV_ITEMS_BY_ROLE, type UserRole } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useSession } from "@/hooks/use-session";

function clearBrowserSessionState() {
  window.localStorage.clear();
  window.sessionStorage.clear();

  const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
  for (const cookie of cookies) {
    const eqIndex = cookie.indexOf("=");
    const name = eqIndex >= 0 ? cookie.slice(0, eqIndex) : cookie;
    if (!name) continue;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

export function AppShell({
  title,
  role,
  children
}: {
  title: string;
  role?: UserRole;
  sidebarVariant?: "default" | "daily-report";
  children: ReactNode;
}) {
  const { data: sessionUser } = useSession();
  const resolvedRole = sessionUser?.role ?? role ?? "team_member";
  const displayName = sessionUser?.name?.trim() || "User";
  const displayEmail = sessionUser?.email?.trim() || "";
  const items = SIDEBAR_NAV_ITEMS_BY_ROLE[resolvedRole];
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    clearBrowserSessionState();
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className="flex h-full min-h-0 flex-col gap-3 px-3 pt-0 lg:flex-row lg:items-start lg:gap-0 lg:px-0 lg:py-0">
        <Sidebar
          roleLabel={ROLE_LABELS[resolvedRole]}
          items={items}
          pathname={pathname}
          onLogout={handleLogout}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-[300px] lg:h-full">
          <div className="sticky top-0 z-20 w-full border-b border-cardBorder bg-[#f8fafc]/95 px-3 pb-3 pt-2 text-textPrimary shadow-soft backdrop-blur-sm dark:bg-slate-950/95 dark:text-slate-100 sm:px-5 sm:pb-4 sm:pt-3 lg:min-h-[136px] lg:px-8 lg:pb-10 lg:pt-5">
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start justify-between gap-3 lg:block">
                <div>
                  <div className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-textSecondary dark:text-slate-400 sm:text-xs sm:tracking-[0.28em]">
                    Workspace
                  </div>
                  <div className="mt-1.5 text-xl font-semibold tracking-tight sm:mt-2.5 sm:text-2xl">{displayName}</div>
                  {displayEmail ? (
                    <div className="mt-1 text-xs text-textSecondary dark:text-slate-400 sm:text-sm">{displayEmail}</div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 shrink-0 rounded-full px-0 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <ThemeToggle />
                <Badge
                  variant="outline"
                  className="hidden rounded-full border-border bg-background/80 px-3 py-1 text-textPrimary dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 sm:inline-flex"
                >
                  Live data ready
                </Badge>
                <Badge className="rounded-full px-3 py-1 capitalize">{ROLE_LABELS[resolvedRole]}</Badge>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 px-3 pt-3 pb-4 lg:px-4 lg:pt-3 lg:pb-5">
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-cardBorder bg-card shadow-soft">
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pr-4 lg:px-5 lg:py-6 lg:pr-6">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
