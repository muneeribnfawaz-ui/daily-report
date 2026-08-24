"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Plus, UserCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";

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

const ALL_CEOS_ITEM: CompanyItem = {
  _id: "all",
  name: "All CEOs",
  code: "ALL",
  isActive: true
};

const ALL_COMPANIES_ITEM: CompanyItem = {
  _id: "all",
  name: "All Companies",
  code: "ALL",
  isActive: true
};

export function CompanySelector() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || "";
    }
    return "";
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const { data: sessionUser } = useSession();
  const isAdmin = sessionUser?.role === "admin";
  const isCeo = sessionUser?.role === "ceo";

  // Fetch Companies for non-admin users
  const { data: fetchedCompanies = [], isLoading: isLoadingCompanies } = useQuery<CompanyItem[]>({
    queryKey: ["header-active-companies"],
    enabled: !isAdmin,
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
      return ceos.map((c) => ({
        _id: String(c._id),
        name: c.name ? `CEO: ${c.name}` : c.email,
        code: "CEO",
        isActive: true
      }));
    }
  });

  const isLoading = isAdmin ? isLoadingCeos : isLoadingCompanies;

  const items = isAdmin
    ? [ALL_CEOS_ITEM, ...fetchedCeos]
    : isCeo
    ? [ALL_COMPANIES_ITEM, ...fetchedCompanies]
    : fetchedCompanies;

  // Handle Initial & Stored Selection without resetting stored value
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

    if (stored) {
      setSelectedCompanyId(stored);
    } else if (items.length > 0) {
      const defaultId = (isAdmin || isCeo) ? "all" : items[0]._id;
      setSelectedCompanyId(defaultId);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, defaultId);
      }
    }
  }, [items, isAdmin, isCeo]);

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
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, item._id);
      window.dispatchEvent(new CustomEvent("company-changed", { detail: item._id }));
    }
    
    try {
      await fetch("/api/auth/me", {
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
        aria-label={isAdmin ? "Toggle CEO Menu" : "Toggle Companies Menu"}
        className="flex h-9 items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-textPrimary shadow-sm transition-all hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 sm:text-sm disabled:cursor-default disabled:opacity-100 disabled:hover:bg-background/80"
      >
        {isAdmin ? (
          <UserCheck className="h-4 w-4 shrink-0 text-purple-500" />
        ) : (
          <Building2 className="h-4 w-4 shrink-0 text-sky-500" />
        )}
        <span className="max-w-[130px] truncate sm:max-w-[170px]">
          {currentItem ? currentItem.name : isLoading ? "Loading..." : isAdmin ? "Select CEO" : "Select Company"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>

      {/* Floating Select Dropdown */}
      {isOpen && (
        <div className="absolute left-0 lg:left-auto lg:right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-left lg:origin-top-right rounded-2xl border border-cardBorder bg-card/95 p-2 text-card-foreground shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
          {/* List Items */}
          <div className="max-h-60 overflow-y-auto space-y-1 py-1">
            {items.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {isAdmin ? "No CEOs found." : "No companies available."}
              </div>
            ) : (
              items.map((item) => {
                const isSelected = item._id === selectedCompanyId;
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? isAdmin
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold"
                        : "hover:bg-accent/60 text-foreground"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="truncate font-medium">{item.name}</div>
                      {item.code && <div className="text-[10px] text-muted-foreground font-mono">{item.code}</div>}
                    </div>
                    {item.isActive ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Active" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" title="Inactive" />
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
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-purple-600 hover:bg-purple-500/10 dark:text-purple-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add CEO</span>
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
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-sky-600 hover:bg-sky-500/10 dark:text-sky-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Company</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
