"use client";

import * as React from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const defaultInputClassName =
  "flex h-10 w-full rounded-xl border bg-card px-3 py-2 text-[16px] sm:text-sm text-textPrimary ring-offset-background placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-12";

const reportInputClassName =
  "h-10 w-full appearance-none rounded-md border bg-card px-3 py-2 text-[16px] sm:text-sm text-textPrimary ring-offset-background placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-12";

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters long", test: (v: string) => v.length >= 8 },
  { id: "uppercase", label: "At least 1 uppercase letter (A-Z)", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lowercase", label: "At least 1 lowercase letter (a-z)", test: (v: string) => /[a-z]/.test(v) },
  { id: "number", label: "At least 1 number (0-9)", test: (v: string) => /[0-9]/.test(v) },
  { id: "special", label: "At least 1 special character (!@#$%^&*)", test: (v: string) => /[^A-Za-z0-9]/.test(v) }
];

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "report";
  showRules?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, variant = "default", showRules = false, value: propsValue, onChange, onFocus, onBlur, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState("");

    const currentValue = (typeof propsValue === "string" || typeof propsValue === "number") ? String(propsValue) : internalValue;
    const inputType = visible ? "text" : "password";
    const inputClassName = variant === "report" ? reportInputClassName : defaultInputClassName;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      if (onChange) onChange(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (onBlur) onBlur(e);
    };

    const passedCount = PASSWORD_RULES.filter((rule) => rule.test(currentValue ?? "")).length;
    const isAllPassed = passedCount === PASSWORD_RULES.length;
    const shouldDisplayRules = showRules && (isFocused || (currentValue && currentValue.length > 0)) && !isAllPassed;

    return (
      <div className="w-full space-y-2">
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            value={propsValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(inputClassName, className)}
            {...props}
          />
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

        {shouldDisplayRules && (
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm transition-all duration-200">
            {/* Strength indicator */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex flex-1 items-center gap-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    passedCount <= 2 ? "bg-rose-500 w-1/3" : passedCount <= 4 ? "bg-amber-500 w-2/3" : "bg-emerald-500 w-full"
                  )}
                />
              </div>
              <span className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground shrink-0">
                {passedCount === 5 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Strong Password</span>
                ) : passedCount >= 3 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Medium</span>
                ) : (
                  <span className="text-rose-500 font-medium">Weak</span>
                )}
              </span>
            </div>

            {/* Rules Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {PASSWORD_RULES.map((rule) => {
                const isPassed = rule.test(currentValue ?? "");
                return (
                  <div key={rule.id} className="flex items-center gap-1.5 text-xs transition-colors duration-150">
                    {isPassed ? (
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
                        <X className="h-3 w-3 stroke-[2.5]" />
                      </div>
                    )}
                    <span className={cn(isPassed ? "text-emerald-700 dark:text-emerald-300 font-medium" : "text-muted-foreground")}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
