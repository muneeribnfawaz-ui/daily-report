"use client";

import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, LayoutGrid, LogOut, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SidebarNavItem } from "@/lib/constants";
import { CompanySelector } from "@/components/layout/company-selector";

export function Sidebar({
  roleLabel,
  items,
  pathname,
  onLogout,
  open,
  onClose
}: {
  roleLabel: string;
  items: ReadonlyArray<SidebarNavItem>;
  pathname: string;
  onLogout: () => Promise<void>;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full w-[min(88vw,320px)] -translate-x-full invisible flex-col overflow-hidden rounded-r-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 text-slate-200 shadow-[4px_0_20px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out lg:w-[300px] lg:min-w-[300px] lg:max-w-[300px] lg:translate-x-0 lg:visible lg:rounded-r-none lg:border-r-0",
        open && "translate-x-0 visible"
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-lg shadow-black/20">
                <img src="/logo.png" alt="MEC Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-sm font-semibold text-transparent">
                  MIF Technology
                </div>
                <div className="mt-0.5 text-xs text-slate-400">Daily Reports</div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Badge className="w-fit rounded-md border border-white/10 bg-white/5 px-3 py-1 capitalize text-[11px] font-medium text-slate-100 shadow-none">
              {roleLabel}
            </Badge>
            <div className="lg:hidden">
              <CompanySelector />
            </div>
          </div>
        </div>

        <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                onClick={onClose}
                className={cn(
                  "group mx-3 flex items-center gap-3 rounded-[14px] px-6 py-3 text-[0.95rem] font-medium transition-all duration-200",
                  active
                    ? "bg-sky-500 text-white shadow-[0_6px_12px_-6px_rgba(59,130,246,0.3)]"
                    : "text-slate-300 hover:bg-sky-500/20 hover:text-white"
                )}
              >
                <LayoutGrid className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <ChevronRight className={cn("h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-80", active && "opacity-80")} />
              </Link>
            );
          })}
        </nav>

      </div>
    </aside>
  );
}
