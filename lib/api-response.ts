import { NextResponse } from "next/server";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} | null;

export interface ApiResponseOptions<T = any> {
  success: boolean;
  status: string;
  statusCode: number;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
  httpStatus?: number;
}

export function apiResponse<T = any>({
  success,
  status,
  statusCode,
  message,
  data = null as any,
  pagination = null,
  httpStatus = 200
}: ApiResponseOptions<T>) {
  return NextResponse.json(
    {
      success,
      status,
      statusCode,
      message,
      data,
      pagination
    },
    { status: httpStatus }
  );
}

export const ApiResponse = {
  success<T>(data: T, message = "Operation completed successfully", statusCode = 1000, pagination: PaginationMeta = null, httpStatus = 200) {
    return apiResponse<T>({ success: true, status: "SUCCESS", statusCode, message, data, pagination, httpStatus });
  },

  created<T>(data: T, message = "Resource created successfully", statusCode = 2001, httpStatus = 201) {
    return apiResponse<T>({ success: true, status: "SUCCESS", statusCode, message, data, httpStatus });
  },

  loginSuccess<T>(data: T, message = "Login successful", statusCode = 1001, httpStatus = 200) {
    return apiResponse<T>({ success: true, status: "SUCCESS", statusCode, message, data, httpStatus });
  },

  loginError(message = "Invalid login credentials", statusCode = 1002, httpStatus = 401) {
    return apiResponse({ success: false, status: "ERROR", statusCode, message, data: null, httpStatus });
  },

  error(message = "An error occurred", statusCode = 4000, httpStatus = 400, data: any = null) {
    return apiResponse({ success: false, status: "ERROR", statusCode, message, data, httpStatus });
  },

  validationError(message = "Validation failed", errors: any = null, statusCode = 4001, httpStatus = 400) {
    return apiResponse({ success: false, status: "VALIDATION_ERROR", statusCode, message, data: errors, httpStatus });
  },

  unauthorized(message = "Unauthorized access", statusCode = 4003, httpStatus = 401) {
    return apiResponse({ success: false, status: "UNAUTHORIZED", statusCode, message, data: null, httpStatus });
  },

  forbidden(message = "Forbidden access", statusCode = 4003, httpStatus = 403) {
    return apiResponse({ success: false, status: "FORBIDDEN", statusCode, message, data: null, httpStatus });
  },

  notFound(message = "Resource not found", statusCode = 4004, httpStatus = 404) {
    return apiResponse({ success: false, status: "NOT_FOUND", statusCode, message, data: null, httpStatus });
  },

  serverError(message = "Internal server error", statusCode = 5000, httpStatus = 500) {
    return apiResponse({ success: false, status: "SERVER_ERROR", statusCode, message, data: null, httpStatus });
  }
};
