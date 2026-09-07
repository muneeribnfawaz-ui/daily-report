import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccessBanksAndPettyCash } from "@/lib/permissions";

export default async function PettyCashLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  
  if (!canAccessBanksAndPettyCash(user)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
