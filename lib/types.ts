import type { UserRole } from "@/lib/constants";

export type ID = string;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamName?: string | null;
  teamNames?: string[] | null;
  status?: string | null;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
}
