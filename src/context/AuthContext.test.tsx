import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useCurrentUser } from "./AuthContext";
const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation, usePathname: () => "/dashboard" }));
const account = { id: "11111111-1111-4111-8111-111111111111", employeeId: "22222222-2222-4222-8222-222222222222", branchId: "33333333-3333-4333-8333-333333333333", name: "Quản trị viên", email: "admin@example.test", systemRole: "admin", role: "admin" };
const response = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(status >= 400 ? { error: data } : { data }) }) as Response;
let auth: ReturnType<typeof useCurrentUser>;
function Consumer() {
    auth = useCurrentUser();
    if (auth.loading) return <p>Đang tải phiên...</p>;
    return <><span data-testid="authenticated">{String(auth.authenticated)}</span><span data-testid="name">{auth.user.name}</span><span data-testid="role">{auth.role}</span><span data-testid="branch">{auth.branchId}</span><span data-testid="employee">{auth.user.employeeId}</span><span data-testid="error">{auth.error}</span></>;
}
function mount() { render(<AuthProvider><Consumer /></AuthProvider>); }
async function ready() { await waitFor(() => expect(screen.queryByText("Đang tải phiên...")).not.toBeInTheDocument()); }
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("Phiên Web", () => {
    it("không xác thực khi cookie hết hạn và chuyển tới đăng nhập", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ code: "UNAUTHORIZED", message: "Phiên hết hạn" }, 401)));
        mount(); await ready();
        expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
        expect(navigation.replace).toHaveBeenCalledWith("/login?from=%2Fdashboard");
    });
    it("ánh xạ UUID tài khoản, nhân viên và phạm vi chi nhánh", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(account)));
        mount(); await ready();
        expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
        expect(auth.user.userId).toBe(account.id);
        expect(screen.getByTestId("employee")).toHaveTextContent(account.employeeId);
        expect(screen.getByTestId("branch")).toHaveTextContent(account.branchId);
        expect(screen.getByTestId("role")).toHaveTextContent("admin");
    });
    it("ưu tiên systemRole và chặn staff dù API trả hồ sơ thành công", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ...account, systemRole: "staff", role: "admin" })));
        mount(); await ready();
        expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
        expect(auth.user.userId).toBe("");
        expect(navigation.replace).toHaveBeenCalledWith("/login?from=%2Fdashboard");
    });
    it("lỗi mạng giữ màn hình lỗi, không chuyển nhầm sang đăng nhập", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        mount(); await ready();
        expect(screen.getByTestId("error")).toHaveTextContent("Không kết nối được máy chủ");
        expect(navigation.replace).not.toHaveBeenCalled();
    });
    it("login gửi nền tảng web, lấy scope từ BE; logout xóa trạng thái phiên", async () => {
        const fetch = vi.fn().mockImplementation(async (url: string) => url.endsWith("/api/auth/me") ? response({ code: "UNAUTHORIZED" }, 401) : url.endsWith("/api/auth/refresh") ? response({ code: "UNAUTHORIZED" }, 401) : url.endsWith("/api/auth/login") ? response({ user: { ...account, systemRole: "manager", role: "manager" } }) : response({ ok: true }));
        vi.stubGlobal("fetch", fetch);
        mount(); await ready();
        await act(async () => { await auth.login("  manager@example.test  ", "password"); });
        expect(auth.authenticated).toBe(true);
        expect(auth.role).toBe("manager");
        expect(fetch.mock.calls.find(call => call[0].endsWith("/api/auth/login"))?.[1]).toMatchObject({ body: JSON.stringify({ email: "manager@example.test", password: "password", clientPlatform: "web" }) });
        await act(async () => { await auth.logout(); });
        expect(auth.authenticated).toBe(false);
        expect(auth.user.userId).toBe("");
        expect(auth.branchId).toBeNull();
        expect(navigation.replace).toHaveBeenLastCalledWith("/login");
    });
    it("từ chối login staff ngay cả khi nhận user thành công", async () => {
        vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => url.endsWith("/api/auth/login") ? response({ user: { ...account, systemRole: "staff", role: "staff" } }) : response({ code: "UNAUTHORIZED" }, 401)));
        mount(); await ready();
        await act(async () => { await expect(auth.login("staff@example.test", "password")).rejects.toMatchObject({ code: "STAFF_WEB_FORBIDDEN", status: 403 }); });
        expect(auth.authenticated).toBe(false);
    });
});

