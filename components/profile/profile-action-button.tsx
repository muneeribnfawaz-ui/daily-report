"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProfileActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingText?: string;
  children: ReactNode;
};

export function ProfileActionButton({
  children,
  className,
  isLoading = false,
  loadingText = "Saving...",
  disabled,
  ...props
}: ProfileActionButtonProps) {
  return (
    <Button className={cn("rounded-full", className)} disabled={disabled || isLoading} {...props}>
      {isLoading ? loadingText : children}
    </Button>
  );
}
