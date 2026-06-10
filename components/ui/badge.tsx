import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" | "soft" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium",
        variant === "default" && "border-primary bg-primary text-primary-foreground",
        variant === "outline" && "bg-card text-textPrimary",
        variant === "soft" && "border-transparent bg-muted text-textSecondary",
        className
      )}
      {...props}
    />
  );
}
