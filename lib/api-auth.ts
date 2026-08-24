import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/api-response";
import type { SessionUser } from "@/lib/types";

export type AllowedRole = "admin" | "ceo" | "hod" | "report_manager" | "team_lead" | "team_member" | "authenticated";

export interface AuthGuardSuccess {
  authorized: true;
  user: SessionUser;
}

export interface AuthGuardFailure {
  authorized: false;
  response: ReturnType<typeof ApiResponse.unauthorized>;
}

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure;

export async function authorizeApi(allowedRoles?: AllowedRole[]): Promise<AuthGuardResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false,
      response: ApiResponse.unauthorized("Authentication required to access this resource.")
    };
  }

  if (user.status === "suspended") {
    return {
      authorized: false,
      response: ApiResponse.forbidden("Your user account is suspended or inactive.")
    };
  }

  if (!allowedRoles || allowedRoles.includes("authenticated")) {
    return { authorized: true, user };
  }

  if (!allowedRoles.includes(user.role as AllowedRole)) {
    return {
      authorized: false,
      response: ApiResponse.forbidden(`Role '${user.role}' is not authorized to access this resource.`)
    };
  }

  return { authorized: true, user };
}
