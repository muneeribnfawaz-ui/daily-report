"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-2 text-sm font-medium text-textSecondary shadow-sm transition hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
          isDark ? "bg-muted text-textSecondary" : "bg-primary text-primary-foreground"
        )}
      >
        <Sun className="h-4 w-4" />
      </span>
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
          isDark ? "bg-primary text-primary-foreground" : "bg-muted text-textSecondary"
        )}
      >
        <Moon className="h-4 w-4" />
      </span>
    </button>
  );
}
