import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// Guard điều hướng; xác thực chữ ký và phân quyền dữ liệu vẫn do Gateway/BE thực hiện.
function webToken(token?: string): { valid: boolean; staff: boolean } {
  try {
    const payload = JSON.parse(Buffer.from((token || "").split(".")[1], "base64url").toString("utf8"));
    const role = payload.role || payload.systemRole;
    return { valid: ["admin", "manager"].includes(role) && typeof payload.exp === "number" && payload.exp * 1000 > Date.now(), staff: role === "staff" };
  } catch { return { valid: false, staff: false }; }
}
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const state = webToken(request.cookies.get("hrm-session")?.value);
  const refresh = request.cookies.has("hrm-refresh");
  if (pathname.startsWith("/dashboard") && (state.staff || (!state.valid && !refresh))) {
    const destination = new URL("/login", request.url); destination.searchParams.set("from", pathname + search);
    return NextResponse.redirect(destination);
  }
  if ((pathname === "/login" || pathname === "/") && state.valid) return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/", "/dashboard", "/dashboard/:path*", "/login"] };
