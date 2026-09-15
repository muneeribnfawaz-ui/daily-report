"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, ChevronDown, ShieldCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { ROLE_LABELS, normalizeRole } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function UserProfileMenu({ onLogout }: { onLogout: () => Promise<void> }) {
  const { t, isRTL } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { data: sessionUser } = useSession();

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

  const resolvedRole = normalizeRole(sessionUser?.role) ?? "team_member";
  const localizedRole = t(`roles.${resolvedRole}`) || ROLE_LABELS[resolvedRole];

  const rawUserName = sessionUser?.name?.trim() || "";
  const displayedName =
    !rawUserName || rawUserName.toLowerCase() === "user"
      ? localizedRole
      : rawUserName.toLowerCase() === "admin"
      ? t("roles.admin")
      : rawUserName.toLowerCase() === "ceo"
      ? t("roles.ceo")
      : rawUserName;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t("nav.profile")}
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
        <div
          className={cn(
            "absolute top-full z-50 mt-2 w-64 max-w-[calc(100vw-24px)] rounded-2xl border border-cardBorder bg-card/95 p-2 text-card-foreground shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 animate-in fade-in-0 zoom-in-95",
            isRTL ? "left-0 origin-top-left" : "right-0 origin-top-right"
          )}
        >
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
                <div className="truncate font-semibold text-sm">{displayedName}</div>
                <div className="truncate text-xs text-muted-foreground">{sessionUser?.email || ""}</div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] py-0.5 px-2">
                <ShieldCheck className="mr-1 h-3 w-3 text-sky-500 rtl:ml-1 rtl:mr-0" />
                {localizedRole}
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
              <span>{t("nav.profile")}</span>
            </Link>
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
              <LogOut className="h-4 w-4 text-rose-500 rtl:rotate-180" />
              <span>{t("nav.logout")}</span>
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
                <LogOut className="h-5 w-5 rtl:rotate-180" />
              </div>
              <div>
                <h3 className="font-semibold text-base">{t("nav.logout")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("common.confirm")}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isLoggingOut}
                className="rounded-xl border border-border px-4 py-2 text-xs font-medium transition hover:bg-accent text-foreground disabled:opacity-50"
              >
                {t("common.cancel")}
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
                {isLoggingOut ? t("common.submitting") : t("nav.logout")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

