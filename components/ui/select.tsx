"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { sharedSelectClassName } from "@/components/form-controls";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(sharedSelectClassName, className)} {...props} />
  )
);
Select.displayName = "Select";
