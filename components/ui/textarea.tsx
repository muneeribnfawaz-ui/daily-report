"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { sharedTextareaClassName } from "@/components/form-controls";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(sharedTextareaClassName, className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
