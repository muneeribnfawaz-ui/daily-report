import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { normalizeRole } from "@/lib/constants";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth/login", "/api/auth/register", "/api/auth/me"];

function withNoStoreHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

async function getTokenPayload(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return withNoStoreHeaders(NextResponse.next());
  }

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return withNoStoreHeaders(NextResponse.next());
  }

  const token = request.cookies.get("drms_token")?.value;
  const payload = token ? await getTokenPayload(token) : null;

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return withNoStoreHeaders(NextResponse.redirect(loginUrl));
  }

  const role = normalizeRole(payload.role as string | undefined);

  if (pathname.startsWith("/admin") && role !== "admin" && role !== "ceo") {
    return withNoStoreHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (pathname.startsWith("/report-manager") && role === "team_member") {
    return withNoStoreHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (pathname.startsWith("/dashboard") && role !== "team_member" && role !== "admin" && role !== "ceo" && role !== "team_lead" && role !== "report_manager") {
    return withNoStoreHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }

  return withNoStoreHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
