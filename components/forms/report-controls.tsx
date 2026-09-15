"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { sharedMultiSelectClassName } from "@/components/form-controls";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ReportField({
  className,
  error,
  label,
  required = false,
  helperText,
  children
}: {
  className?: string;
  error?: string | null;
  label?: string;
  required?: boolean;
  helperText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <div className="text-sm font-medium text-textPrimary">
          {label}
          {required ? <span className="ml-1 rtl:mr-1 rtl:ml-0 text-danger">*</span> : null}
        </div>
      ) : null}
      {helperText ? <div className="text-xs text-textSecondary">{helperText}</div> : null}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export const ReportInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => <Input ref={ref} className={cn(className)} {...props} />
);
ReportInput.displayName = "ReportInput";

export const ReportTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<typeof Textarea>>(
  ({ className, ...props }, ref) => <Textarea ref={ref} className={cn(className)} {...props} />
);
ReportTextarea.displayName = "ReportTextarea";

export const ReportSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <Select ref={ref} className={cn(className)} {...props} />
);
ReportSelect.displayName = "ReportSelect";

export const ReportMultiSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <Select ref={ref} multiple className={cn(sharedMultiSelectClassName, className)} {...props} />
);
ReportMultiSelect.displayName = "ReportMultiSelect";

import { useTranslation } from "@/lib/i18n";

type MultiSelectCardOption = {
  value: string;
  label: string;
  description?: string;
};

export function ReportMultiSelectCards({
  className,
  error,
  label,
  required = false,
  helperText,
  emptyMessage,
  options,
  value,
  onChange
}: {
  className?: string;
  error?: string | null;
  label: string;
  required?: boolean;
  helperText?: string;
  emptyMessage?: string;
  options: MultiSelectCardOption[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { t, isRtl } = useTranslation();
  const selectedValues = value ?? [];
  const labelByValue = Object.fromEntries(options.map((option) => [option.value, option.label]));

  const isMatch = (a: string, b: string) => {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  };

  const isOptionSelected = (option: MultiSelectCardOption) => {
    return selectedValues.some(
      (val) => isMatch(val, option.value) || (option.label && isMatch(val, option.label))
    );
  };

  const toggleValue = (option: MultiSelectCardOption) => {
    const isSelected = isOptionSelected(option);
    if (isSelected) {
      onChange(
        selectedValues.filter(
          (val) => !isMatch(val, option.value) && (!option.label || !isMatch(val, option.label))
        )
      );
    } else {
      onChange([...selectedValues, option.value]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-textPrimary">
            {label}
            {required ? <span className="ml-1 rtl:mr-1 rtl:ml-0 text-danger">*</span> : null}
          </div>
          {helperText ? <div className="text-xs text-textSecondary">{helperText}</div> : null}
        </div>
        <div className="text-xs text-textSecondary">
          {selectedValues.length} {t("common.selected", "selected")}
        </div>
      </div>

      {options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
          {emptyMessage || t("common.noOptionsAvailable", "No options available.")}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => {
            const isSelected = isOptionSelected(option);

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleValue(option)}
                className={cn(
                  "flex min-h-24 flex-col justify-between rounded-md border p-4 text-left rtl:text-right transition",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "bg-card hover:border-primary hover:bg-accent/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">{option.label}</div>
                    {option.description ? <div className="text-xs text-textSecondary">{option.description}</div> : null}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                    )}
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedValues.length ? (
            selectedValues.map((selectedValue) => (
              <span key={selectedValue} className="rounded-md border bg-muted px-2.5 py-1 text-xs font-medium text-textPrimary">
                {labelByValue[selectedValue] ?? selectedValue}
              </span>
            ))
          ) : (
            <span className="text-xs text-textSecondary">{t("users.noTypesSelectedYet", "No types selected yet.")}</span>
          )}
        </div>
      )}

      {error && options.length > 0 ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
