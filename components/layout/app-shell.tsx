"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { ROLE_LABELS, SIDEBAR_NAV_ITEMS_BY_ROLE, type UserRole } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CompanySelector } from "@/components/layout/company-selector";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserProfileMenu } from "@/components/layout/user-profile-menu";
import { useSession } from "@/hooks/use-session";
import { canSeeFinanceTab, isInFinance, canAccessBanksAndPettyCash } from "@/lib/permissions";

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
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const queryClient = useQueryClient();

  useEffect(() => {
    const stored = localStorage.getItem("daily_report_selected_department");
    if (stored) {
      setSelectedDepartment(stored);
    }
    const handleDeptChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setSelectedDepartment(customEvent.detail);
      }
      queryClient.invalidateQueries();
    };
    const handleCompanyChange = () => {
      queryClient.invalidateQueries();
    };
    window.addEventListener("department-changed", handleDeptChange);
    window.addEventListener("company-changed", handleCompanyChange);
    return () => {
      window.removeEventListener("department-changed", handleDeptChange);
      window.removeEventListener("company-changed", handleCompanyChange);
    };
  }, [queryClient]);

  const isFinanceTLorTM = (resolvedRole === "team_lead" || resolvedRole === "team_member") && isInFinance(sessionUser ?? null);
  const showBanksAndPettyCash = sessionUser ? canAccessBanksAndPettyCash(sessionUser) : (role === "admin" || role === "ceo" || isFinanceTLorTM);

  const items = useMemo(() => {
    let rawItems: Array<{ href: string; label: string }> = [...SIDEBAR_NAV_ITEMS_BY_ROLE[resolvedRole]];
    const hasFinanceAccess = canSeeFinanceTab(sessionUser ?? null);
    const userIsInFinance = sessionUser ? isInFinance(sessionUser) : false;

    if (userIsInFinance && (resolvedRole === "team_lead" || resolvedRole === "team_member")) {
      const financeNav: Array<{ href: string; label: string }> = [];

      if (resolvedRole === "team_lead") {
        financeNav.push({ href: "/team-lead/dashboard", label: "Dashboard" });
        financeNav.push({ href: "/finance/my-reports", label: "My Reports" });
        financeNav.push({ href: "/finance", label: "All Reports" });
        financeNav.push({ href: "/team-lead/users", label: "Employees" });
      } else {
        financeNav.push({ href: "/tm/dashboard", label: "Dashboard" });
        financeNav.push({ href: "/finance/my-reports", label: "My Reports" });
      }

      financeNav.push({ href: "/finance/requests", label: "Money Request" });
      if (showBanksAndPettyCash) {
        financeNav.push({ href: "/finance/banks", label: "Bank List" });
        financeNav.push({ href: "/finance/petty-cash", label: "Petty Cash" });
      }

      return financeNav;
    }

    if (selectedDepartment === "Finance") {
      const isHodOrStaff = resolvedRole === "hod" || resolvedRole === "report_manager" || resolvedRole === "team_lead" || resolvedRole === "team_member";
      if (isHodOrStaff) {
        const baseDashboard = resolvedRole === "hod" || resolvedRole === "team_lead" ? [{ href: "/dashboard", label: "Dashboard" }] : [];
        const baseEmployees = resolvedRole === "hod" ? [{ href: "/users", label: "Employees" }] : resolvedRole === "team_lead" ? [{ href: "/users", label: "My Team" }] : [];
        const baseTeamTypes = resolvedRole === "hod" ? [{ href: "/hod/team-types", label: "Team Types" }] : [];
        const myReports = resolvedRole !== "hod" ? [{ href: "/finance/create", label: "My Reports" }] : [];

        return [
          ...baseDashboard,
          ...baseEmployees,
          ...baseTeamTypes,
          ...myReports,
          { href: "/finance", label: "Finance Report" },
          { href: "/finance/requests", label: "Money Request" },
          ...(showBanksAndPettyCash ? [{ href: "/finance/banks", label: "Bank List" }] : []),
          ...(showBanksAndPettyCash ? [{ href: "/finance/petty-cash", label: "Petty Cash" }] : []),
          { href: "/consolidated-reports", label: "Consolidated" }
        ];
      }
    }

    if (selectedDepartment !== "Finance" && selectedDepartment !== "all") {
      return rawItems.filter((i) => !i.href.startsWith("/finance"));
    }

    if (hasFinanceAccess) {
      const hasFinance = rawItems.some((i) => i.href === "/finance");
      if (!hasFinance) {
        const employeesIdx = rawItems.findIndex((i) => i.label === "Employees" || i.label === "My Team" || i.label === "Companies");
        const insertIdx = employeesIdx !== -1 ? employeesIdx + 1 : 1;

        const newItems = [...rawItems];
        newItems.splice(insertIdx, 0,
          { href: "/finance", label: "Finance Report" },
          { href: "/finance/requests", label: "Money Request" },
          ...(showBanksAndPettyCash ? [{ href: "/finance/banks", label: "Bank List" }] : []),
          ...(showBanksAndPettyCash ? [{ href: "/finance/petty-cash", label: "Petty Cash" }] : [])
        );
        return newItems;
      } else {
        let newItems = rawItems.map((i) => (i.href === "/finance" ? { ...i, label: "Finance Report" } : i));
        const finIdx = newItems.findIndex((i) => i.href === "/finance");

        if (!newItems.some((i) => i.href === "/finance/requests")) {
          newItems.splice(finIdx + 1, 0, { href: "/finance/requests", label: "Money Request" });
        }
        if (showBanksAndPettyCash && !newItems.some((i) => i.href === "/finance/banks")) {
          const reqIdx = newItems.findIndex((i) => i.href === "/finance/requests");
          newItems.splice(reqIdx + 1, 0, { href: "/finance/banks", label: "Bank List" });
        }
        if (showBanksAndPettyCash && !newItems.some((i) => i.href === "/finance/petty-cash")) {
          const anchorIdx = newItems.findIndex((i) => i.href === "/finance/banks" || i.href === "/finance/requests");
          newItems.splice(anchorIdx + 1, 0, { href: "/finance/petty-cash", label: "Petty Cash" });
        }
        return newItems;
      }
    } else {
      return rawItems.filter((i) => !i.href.startsWith("/finance"));
    }
  }, [resolvedRole, selectedDepartment, sessionUser, showBanksAndPettyCash]);

  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const fromPath = typeof window !== "undefined" ? window.location.pathname : "";
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "include"
      });
    } finally {
      clearBrowserSessionState();
      queryClient.clear();
      if (typeof window !== "undefined") {
        const loginUrl = fromPath && fromPath !== "/" ? `/login?from=${encodeURIComponent(fromPath)}` : "/login";
        window.location.replace(loginUrl);
      } else {
        router.replace("/login");
      }
    }
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
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
          {/* Top Navbar Header Component */}
          <div className="sticky top-0 z-30 w-full border-b border-primary/20 bg-navbar px-3 pb-3 pt-2 text-sidebarText shadow-md backdrop-blur-sm sm:px-5 sm:pb-4 sm:pt-3 lg:min-h-[136px] lg:px-8 lg:pb-10 lg:pt-5">
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start justify-between gap-3 lg:block">
                <div>
                  <div className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-primary sm:text-xs sm:tracking-[0.28em]">
                    Workspace
                  </div>
                  <div className="mt-1.5 text-xl font-bold tracking-tight text-sidebarText sm:mt-2.5 sm:text-2xl">{displayName}</div>
                  {displayEmail ? (
                    <div className="mt-1 text-xs text-sidebarText/75 sm:text-sm">{displayEmail}</div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 shrink-0 rounded-full px-0 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex w-full items-center justify-between gap-2 sm:gap-3 lg:w-auto lg:justify-end">
                <div className="flex-1 min-w-0 sm:flex-initial">
                  <CompanySelector />
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3 ml-auto">
                  <NotificationBell />
                  <UserProfileMenu onLogout={handleLogout} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 px-3 pt-3 pb-4 lg:px-4 lg:pt-3 lg:pb-5">
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-md">
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
