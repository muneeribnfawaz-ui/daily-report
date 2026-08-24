"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const defaultInputClassName =
  "flex h-10 w-full rounded-xl border bg-card px-3 py-2 text-[16px] sm:text-sm text-textPrimary ring-offset-background placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-12";

const reportInputClassName =
  "h-10 w-full appearance-none rounded-md border bg-card px-3 py-2 text-[16px] sm:text-sm text-textPrimary ring-offset-background placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-12";

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { variant?: "default" | "report" }
>(({ className, variant = "default", ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  const inputType = visible ? "text" : "password";
  const inputClassName = variant === "report" ? reportInputClassName : defaultInputClassName;

  return (
    <div className="relative">
      <input ref={ref} type={inputType} className={cn(inputClassName, className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 px-0 text-textSecondary hover:bg-transparent hover:text-textPrimary"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
