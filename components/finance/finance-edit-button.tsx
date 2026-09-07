"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

type FinanceEditButtonProps = {
  reportId: string;
  canEdit?: boolean;
  editAccessRequested?: boolean;
  editAccessGranted?: boolean;
  isTMorTL?: boolean;
  isCreator?: boolean;
  userRole?: string;
};

export function FinanceEditButton({
  reportId,
  isCreator = true,
  userRole
}: FinanceEditButtonProps) {
  const isAdminOrCEO = userRole === "admin" || userRole === "ceo";
  const showEditButton = isAdminOrCEO || isCreator;

  if (!showEditButton) return null;

  return (
    <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
      <Link href={`/finance/${reportId}/edit`}>
        <Edit className="h-4 w-4" />
      </Link>
    </Button>
  );
}
