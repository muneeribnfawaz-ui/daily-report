"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Route } from "next";

type NotificationItem = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl: string;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      const json = await res.json();
      return json.data as { notifications: NotificationItem[]; unreadCount: number };
    },
    staleTime: 30_000,
    refetchInterval: 60_000
  });

  const markReadMutation = useMutation({
    mutationFn: async (payload: { notificationIds?: string[]; markAllRead?: boolean }) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative h-9 w-9 rounded-full px-0"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white shadow-md">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-[340px] overflow-hidden rounded-xl border border-cardBorder bg-card shadow-lg sm:w-[380px]">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold">Notifications</div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={() => markReadMutation.mutate({ markAllRead: true })}
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`border-b px-4 py-3 transition-colors last:border-b-0 ${
                    n.isRead ? "bg-card" : "bg-primary/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!n.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                        <span className="text-sm font-medium truncate">{n.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                        {n.linkUrl && (
                          <Link
                            href={n.linkUrl as Route}
                            className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                            onClick={() => {
                              if (!n.isRead) {
                                markReadMutation.mutate({ notificationIds: [n._id] });
                              }
                              setIsOpen(false);
                            }}
                          >
                            View <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
