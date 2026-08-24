"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, Sun, Moon, ChevronDown, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "@/hooks/use-session";
import { ROLE_LABELS, normalizeRole } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export function UserProfileMenu({ onLogout }: { onLogout: () => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { data: sessionUser } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = sessionUser?.name
    ? sessionUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const resolvedRole = sessionUser?.role ? normalizeRole(sessionUser.role) ?? "team_member" : "team_member";

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle user profile menu"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-background/80 shadow-sm transition-all hover:ring-2 hover:ring-sky-500/40 focus:outline-none focus:ring-2 focus:ring-ring dark:border-slate-700 dark:bg-slate-900/80"
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 font-bold text-white text-xs shadow-sm">
          {sessionUser?.avatarUrl ? (
            <img src={sessionUser.avatarUrl} alt={sessionUser.name || "User Avatar"} className="h-full w-full object-cover" />
          ) : (
            <span>{initials[0]}</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl border border-cardBorder bg-card/95 p-2 text-card-foreground shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
          {/* User Info Header */}
          <div className="border-b border-cardBorder p-3 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 font-bold text-white text-sm shadow-sm">
                {sessionUser?.avatarUrl ? (
                  <img src={sessionUser.avatarUrl} alt={sessionUser.name || "User Avatar"} className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-sm">{sessionUser?.name || "User"}</div>
                <div className="truncate text-xs text-muted-foreground">{sessionUser?.email || ""}</div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              <Badge variant="outline" className="capitalize text-[10px] py-0.5 px-2">
                <ShieldCheck className="mr-1 h-3 w-3 text-sky-500" />
                {ROLE_LABELS[resolvedRole]}
              </Badge>
            </div>
          </div>

          {/* Menu Options */}
          <div className="space-y-1 py-1.5">
            {/* Profile Link */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <User className="h-4 w-4 text-sky-500" />
              <span>Profile</span>
            </Link>

            {/* Dark/Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-2.5">
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-500" />
                )}
                <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
              </div>
              <span className="text-[10px] text-muted-foreground capitalize">{isDark ? "Dark" : "Light"}</span>
            </button>
          </div>

          {/* Logout Option */}
          <div className="border-t border-cardBorder pt-1.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowConfirmModal(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4 text-rose-500" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-cardBorder bg-card p-6 text-card-foreground shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Confirm Logout</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Are you sure you want to log out of your session?</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isLoggingOut}
                className="rounded-xl border border-border px-4 py-2 text-xs font-medium transition hover:bg-accent text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={async () => {
                  setIsLoggingOut(true);
                  try {
                    await onLogout();
                  } finally {
                    setIsLoggingOut(false);
                    setShowConfirmModal(false);
                  }
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
