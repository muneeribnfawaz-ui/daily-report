"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { sharedInputClassName } from "@/components/form-controls";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", onPointerDown, ...props }, ref) => {
    const handlePointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
      if (type === "date") {
        try {
          event.currentTarget.showPicker?.();
        } catch {
          event.currentTarget.focus();
        }
      }

      onPointerDown?.(event);
    };

    return (
      <input
        type={type}
        ref={ref}
        className={cn(sharedInputClassName, type === "date" ? "cursor-pointer" : null, className)}
        onPointerDown={handlePointerDown}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
