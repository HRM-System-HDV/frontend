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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("hrm-session");
  const token = sessionCookie?.value;
  const isAuthenticated = isTokenValid(token);
  // Access token chỉ 15 phút, cookie refresh sống 7 ngày. Còn refresh token tức
  // là phiên chưa chết: cứ mở trang, client đổi access token qua /api/auth/refresh
  // (api.ts) rồi xác thực lại với gateway. Ở đây chỉ kiểm tra nhanh, không gọi
  // API và không quyết định quyền — gateway vẫn là chỗ chặn thật.
  const canRenew = !isAuthenticated && isTokenValid(request.cookies.get("hrm-refresh")?.value);

  // 1. Bảo vệ tất cả các đường dẫn /dashboard/*: không còn phiên nào thì chuyển
  // về login; expired=1 để trang login báo "Phiên làm việc đã hết hạn".
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated && !canRenew) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      // Có cookie nhưng chết hẳn (refresh cũng hết hạn/mất) => báo hết phiên.
      if (token) loginUrl.searchParams.set("expired", "1");
      const res = NextResponse.redirect(loginUrl);
      if (token) res.cookies.delete("hrm-session");
      return res;
    }
  }

  // 2. Nếu đã đăng nhập thật sự mà truy cập / hoặc /login -> chuyển vào /dashboard.
  // Không nhảy theo canRenew: nếu refresh token đã bị thu hồi thì vòng
  // /login -> /dashboard -> /login lặp vô hạn, thà để trang login tự xác minh.
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
