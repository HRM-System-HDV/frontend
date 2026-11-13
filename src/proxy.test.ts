import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
function request(path: string, payload?: Record<string, unknown>, refresh = false) {
    const token = payload ? "header." + Buffer.from(JSON.stringify(payload)).toString("base64url") + ".signature" : "";
    return new NextRequest("http://localhost:3000" + path, { headers: { cookie: [token ? "hrm-session=" + token : "", refresh ? "hrm-refresh=refresh" : ""].filter(Boolean).join("; ") } });
}
describe("Proxy điều hướng Web", () => {
    it("giữ đường dẫn và query khi chuyển khách về đăng nhập", () => {
        const location = proxy(request("/dashboard/payslips?month=2026-11")).headers.get("location");
        expect(new URL(location!).pathname).toBe("/login");
        expect(new URL(location!).searchParams.get("from")).toBe("/dashboard/payslips?month=2026-11");
    });
    it("staff bị chặn kể cả có refresh cookie", () => {
        const res = proxy(request("/dashboard", { role: "staff", exp: Math.floor(Date.now() / 1000) + 3600 }, true));
        expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    });
    it("phiên admin/manager hợp lệ đi qua và trang đăng nhập chuyển về dashboard", () => {
        for (const role of ["admin", "manager"]) {
            const payload = { role, exp: Math.floor(Date.now() / 1000) + 3600 };
            expect(proxy(request("/dashboard/payslips", payload)).headers.get("location")).toBeNull();
            expect(new URL(proxy(request("/login", payload)).headers.get("location")!).pathname).toBe("/dashboard");
        }
    });
    it("cookie refresh cho phép client khôi phục phiên hết hạn; cookie hỏng đơn lẻ bị chặn", () => {
        expect(proxy(request("/dashboard", { role: "manager", exp: 1 }, true)).headers.get("location")).toBeNull();
        expect(new URL(proxy(request("/dashboard", { role: "admin", exp: 1 })).headers.get("location")!).pathname).toBe("/login");
        expect(new URL(proxy(request("/dashboard", { role: "admin" })).headers.get("location")!).pathname).toBe("/login");
    });
});

