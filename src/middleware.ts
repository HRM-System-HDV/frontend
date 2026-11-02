import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isTokenValid(token?: string): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    const payload = JSON.parse(jsonPayload);
    if (!payload || typeof payload !== "object") return false;
    if (payload.exp && typeof payload.exp === "number") {
      if (payload.exp * 1000 <= Date.now()) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("hrm-session");
  const token = sessionCookie?.value;
  const isAuthenticated = isTokenValid(token);

  // 1. Bảo vệ tất cả các đường dẫn /dashboard/*: chưa đăng nhập thì chặn và chuyển về /login
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (token && !isAuthenticated) {
        res.cookies.delete("hrm-session");
      }
      return res;
    }
  }

  // 2. Nếu đã đăng nhập mà truy cập / hoặc /login -> chuyển hướng thẳng vào /dashboard
  if (pathname === "/login" || pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard", "/dashboard/:path*", "/login"],
};
