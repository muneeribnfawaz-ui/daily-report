"use client";

import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, LayoutGrid, X } from "lucide-react";
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
        "fixed inset-y-0 left-0 z-50 flex h-full w-[min(88vw,320px)] -translate-x-full invisible flex-col overflow-hidden rounded-r-2xl border-r border-primary/20 bg-sidebar p-4 text-sidebarText shadow-2xl transition-transform duration-300 ease-out lg:w-[300px] lg:min-w-[300px] lg:max-w-[300px] lg:translate-x-0 lg:visible lg:rounded-r-none",
        open && "translate-x-0 visible"
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="rounded-2xl border border-primary/20 bg-sidebar/80 p-4 text-sidebarText shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground p-1.5 shadow-md font-bold">
                <img src="/logo.png" alt="MEC Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-sm font-bold text-sidebarText tracking-tight">
                  MIF Technology
                </div>
                <div className="mt-0.5 text-xs text-primary font-medium">Daily Reports</div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0 text-sidebarText hover:bg-primary/20 hover:text-primary lg:hidden"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Badge className="w-fit rounded-md border border-primary/30 bg-primary/15 px-3 py-1 capitalize text-[11px] font-bold text-primary shadow-none">
              {roleLabel}
            </Badge>
            <div className="lg:hidden">
              <CompanySelector />
            </div>
          </div>
        </div>

        <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const active =
              item.href === "/finance"
                ? pathname === "/finance" || (pathname.startsWith("/finance/") && !pathname.startsWith("/finance/requests") && !pathname.startsWith("/finance/banks") && !pathname.startsWith("/finance/petty-cash") && !pathname.startsWith("/finance/create") && !pathname.startsWith("/finance/my-reports"))
                : pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                onClick={onClose}
                className={cn(
                  "group mx-2 flex items-center gap-3 rounded-[14px] px-5 py-3 text-[0.95rem] font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground font-bold shadow-md"
                    : "text-sidebarText/85 hover:bg-primary/15 hover:text-primary"
                )}
              >
                <LayoutGrid className={cn("h-5 w-5 shrink-0", active ? "text-primary-foreground" : "text-primary")} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <ChevronRight className={cn("h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-80", active && "opacity-90 text-primary-foreground")} />
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
