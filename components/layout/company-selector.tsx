"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Layers, Plus, UserCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { DEPARTMENT_OPTIONS } from "@/lib/constants";
import { formatDisplayName } from "@/lib/utils";

import { useTranslation } from "@/lib/i18n";

export type CompanyItem = {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
};

const STORAGE_KEY = "daily_report_selected_company";
const DEPT_STORAGE_KEY = "daily_report_selected_department";

export function CompanySelector() {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: sessionUser } = useSession();

  const ALL_CEOS_ITEM: CompanyItem = useMemo(
    () => ({
      _id: "all",
      name: t("common.allCeos"),
      code: "ALL",
      isActive: true
    }),
    [t]
  );

  const ALL_COMPANIES_ITEM: CompanyItem = useMemo(
    () => ({
      _id: "all",
      name: t("common.allCompanies"),
      code: "ALL",
      isActive: true
    }),
    [t]
  );

  const ALL_DEPARTMENTS_ITEM: CompanyItem = useMemo(
    () => ({
      _id: "all",
      name: t("common.allDepartments"),
      code: "ALL",
      isActive: true
    }),
    [t]
  );

  const ALL_TEAMS_ITEM: CompanyItem = useMemo(
    () => ({
      _id: "all",
      name: t("common.allTeams"),
      code: "ALL",
      isActive: true
    }),
    [t]
  );
  
  const isAdmin = sessionUser?.role === "admin";
  const isCeo = sessionUser?.role === "ceo";
  const isHod = sessionUser?.role === "hod";
  const isReportManager = sessionUser?.role === "report_manager";
  const isTeamLead = sessionUser?.role === "team_lead";
  const isTeamMember = sessionUser?.role === "team_member";
  const isDeptRole = isHod || isReportManager;
  const isTeamRole = isTeamLead || isTeamMember;

  // Fetch Companies for non-admin, non-team/dept roles
  const { data: fetchedCompanies = [], isLoading: isLoadingCompanies } = useQuery<CompanyItem[]>({
    queryKey: ["header-active-companies"],
    enabled: !isAdmin && !isDeptRole && !isTeamRole,
    queryFn: async () => {
      const res = await fetch("/api/companies");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []) as CompanyItem[];
    }
  });

  // Fetch CEO Users list for Admin users
  const { data: fetchedCeos = [], isLoading: isLoadingCeos } = useQuery<CompanyItem[]>({
    queryKey: ["header-ceos-list"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await fetch("/api/admin/users?role=ceo");
      if (!res.ok) return [];
      const json = await res.json();
      const ceos = (json.data || []) as Array<{ _id: string; name: string; email: string }>;
      const uniqueMap = new Map<string, CompanyItem>();
      for (const c of ceos) {
        const idStr = String(c._id);
        if (!uniqueMap.has(idStr)) {
          uniqueMap.set(idStr, {
            _id: idStr,
            name: c.name ? t("common.ceoPrefix", { name: c.name }) : c.email,
            code: "CEO",
            isActive: true
          });
        }
      }
      return Array.from(uniqueMap.values());
    }
  });

  // Department Items for HOD & Report Manager
  const deptDepartmentItems = useMemo<CompanyItem[]>(() => {
    if (!isDeptRole) return [];
    
    let deptNames: string[] = [];
    if (sessionUser?.departments && sessionUser.departments.length > 0) {
      deptNames = sessionUser.departments
        .map((d: any) => (typeof d === "string" ? d : d?.name || String(d)))
        .filter(Boolean);
    } else if (isHod) {
      // HOD fallback if no specific departments assigned
      deptNames = [...DEPARTMENT_OPTIONS];
    }

    const uniqueDepts = Array.from(new Set(deptNames));
    const deptItems = uniqueDepts.map((dept) => ({
      _id: dept,
      name: dept,
      code: "DEPT",
      isActive: true
    }));

    return [ALL_DEPARTMENTS_ITEM, ...deptItems];
  }, [ALL_DEPARTMENTS_ITEM, isDeptRole, isHod, sessionUser?.departments]);

  // Team Items for Team Lead & Team Member
  const userTeamNames = useMemo<string[]>(() => {
    if (!isTeamRole || !sessionUser) return [];
    const names = [
      ...(sessionUser.teamNames ?? []),
      ...(sessionUser.teamName ? [sessionUser.teamName] : [])
    ];
    return Array.from(new Set(names.filter(Boolean)));
  }, [isTeamRole, sessionUser]);

  const teamItems = useMemo<CompanyItem[]>(() => {
    if (!isTeamRole) return [];
    const tItems = userTeamNames.map((tName) => ({
      _id: tName,
      name: tName,
      code: "TEAM",
      isActive: true
    }));
    return [ALL_TEAMS_ITEM, ...tItems];
  }, [ALL_TEAMS_ITEM, isTeamRole, userTeamNames]);

  // Combine items based on active role
  const items = useMemo<CompanyItem[]>(() => {
    if (isAdmin) {
      return [ALL_CEOS_ITEM, ...fetchedCeos];
    }
    if (isDeptRole) {
      return deptDepartmentItems;
    }
    if (isTeamRole) {
      return teamItems;
    }
    return [ALL_COMPANIES_ITEM, ...fetchedCompanies];
  }, [isAdmin, isDeptRole, isTeamRole, ALL_CEOS_ITEM, fetchedCeos, deptDepartmentItems, teamItems, ALL_COMPANIES_ITEM, fetchedCompanies]);

  const isLoading = isLoadingCompanies || isLoadingCeos;

  // Sync selection on mount and on storage events
  useEffect(() => {
    const keyToUse = isDeptRole || isTeamRole ? DEPT_STORAGE_KEY : STORAGE_KEY;
    const stored = localStorage.getItem(keyToUse);
    if (stored) {
      setSelectedCompanyId(stored);
    } else {
      setSelectedCompanyId("all");
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === keyToUse && e.newValue) {
        setSelectedCompanyId(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [isDeptRole, isTeamRole]);

  // Outside click listener to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = async (item: CompanyItem) => {
    setSelectedCompanyId(item._id);

    if (isDeptRole || isTeamRole) {
      localStorage.setItem(DEPT_STORAGE_KEY, item._id);
      window.dispatchEvent(new CustomEvent("department-changed", { detail: item._id }));
      queryClient.invalidateQueries();
      setIsOpen(false);
      router.refresh();
      return;
    }

    localStorage.setItem(STORAGE_KEY, item._id);
    window.dispatchEvent(new CustomEvent("company-changed", { detail: item._id }));
    queryClient.invalidateQueries();

    try {
      await fetch("/api/auth/session/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: item._id })
      });
    } catch (e) {
      console.error("Failed to update session workspace:", e);
    }

    setIsOpen(false);

    if (isAdmin && item._id === "all") {
      router.push("/admin/users?role=ceo");
    } else if (isCeo && item._id === "all") {
      router.push("/ceo/companies");
    } else {
      router.refresh();
    }
  };

  const currentItem = items.find((c) => c._id === selectedCompanyId) || items[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Header Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isLoading || items.length <= 0}
        aria-label={
          isAdmin
            ? t("common.toggleCeoMenu")
            : isDeptRole
            ? t("common.toggleDepartmentMenu")
            : isTeamRole
            ? t("common.toggleTeamMenu")
            : t("common.toggleCompaniesMenu")
        }
        className="flex h-9 items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-textPrimary shadow-sm transition-all hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 sm:text-sm disabled:cursor-default disabled:opacity-100 disabled:hover:bg-background/80"
      >
        {isAdmin ? (
          <UserCheck className="h-4 w-4 shrink-0 text-purple-500" />
        ) : (isDeptRole || isTeamRole) ? (
          <Layers className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : (
          <Building2 className="h-4 w-4 shrink-0 text-sky-500" />
        )}
        <span className="max-w-[130px] truncate sm:max-w-[170px]">
          {currentItem
            ? formatDisplayName(currentItem.name)
            : isLoading
            ? t("common.loading")
            : isAdmin
            ? t("common.selectCeo")
            : isDeptRole
            ? t("common.selectDepartment")
            : isTeamRole
            ? t("common.selectTeam")
            : t("common.selectCompany")}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>

      {/* Floating Select Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            isRTL ? "right-0 lg:right-auto lg:left-0 origin-top-right lg:origin-top-left" : "left-0 lg:left-auto lg:right-0 origin-top-left lg:origin-top-right"
          } z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-cardBorder bg-card/95 p-2 text-card-foreground shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95`}
        >
          {/* List Items */}
          <div className="max-h-60 overflow-y-auto space-y-1 py-1">
            {items.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {isAdmin ? t("common.noCeosFound") : isDeptRole ? t("common.noDepartmentsFound") : isTeamRole ? t("common.noTeamsFound") : t("companies.noCompaniesFound")}
              </div>
            ) : (
              items.map((item) => {
                const isSelected = item._id === selectedCompanyId;
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left rtl:text-right text-xs transition-colors ${
                      isSelected
                        ? isAdmin
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold"
                        : "hover:bg-accent/60 text-foreground"
                    }`}
                  >
                    <div className="min-w-0 flex-1 ltr:pr-2 rtl:pl-2">
                      <div className="truncate font-medium">{formatDisplayName(item.name)}</div>
                      {item.code && <div className="text-[10px] text-muted-foreground font-mono">{item.code}</div>}
                    </div>
                    {item.isActive ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title={t("common.active")} />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" title={t("common.inactive")} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Add CEO option for Admin */}
          {isAdmin && (
            <div className="mt-1 border-t border-cardBorder pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/admin/users/create?role=ceo");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left rtl:text-right text-xs font-semibold text-purple-600 hover:bg-purple-500/10 dark:text-purple-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("users.addCeo")}</span>
              </button>
            </div>
          )}

          {/* Add Company option for CEO */}
          {isCeo && (
            <div className="mt-1 border-t border-cardBorder pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/admin/companies");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left rtl:text-right text-xs font-semibold text-sky-600 hover:bg-sky-500/10 dark:text-sky-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("companies.createCompany")}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
