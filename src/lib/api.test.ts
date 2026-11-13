import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiPost, apiPut, apiDelete, createPayout, postSoapPayroll, GATEWAY_URL } from "./api";
const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => typeof body === "string" ? body : JSON.stringify(body) }) as Response;
afterEach(() => { vi.unstubAllGlobals(); });
describe("Gateway client", () => {
    it("đọc envelope qua text và gửi cookie phiên", async () => {
        const fetch = vi.fn().mockResolvedValue(response({ data: [{ id: "branch" }] }));
        vi.stubGlobal("fetch", fetch);
        expect(await apiGet("/api/branches")).toEqual([{ id: "branch" }]);
        expect(fetch).toHaveBeenCalledWith(GATEWAY_URL + "/api/branches", expect.objectContaining({ credentials: "include", signal: expect.any(AbortSignal) }));
    });
    it("đọc health JSON trực tiếp và từ chối phản hồi JSON hỏng", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({ status: "ok" })).mockResolvedValueOnce(response("<html>error</html>")));
        expect(await apiGet("/health")).toEqual({ status: "ok" });
        await expect(apiGet("/api/branches")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    });
    it("POST/PUT/DELETE chỉ gửi nghiệp vụ, không tự ghi nhật ký từ trình duyệt", async () => {
        const fetch = vi.fn().mockResolvedValue(response({ data: { ok: true } }));
        vi.stubGlobal("fetch", fetch);
        const id = "11111111-1111-4111-8111-111111111111";
        await apiPost("/api/departments", { name: "Nhân sự" });
        await apiPut("/api/departments/" + id, { name: "Vận hành" });
        await apiDelete("/api/departments/" + id);
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch.mock.calls.map((call: unknown[]) => (call[1] as RequestInit).method)).toEqual(["POST", "PUT", "DELETE"]);
        expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Nhân sự" }) });
        expect(fetch.mock.calls.some((call: unknown[]) => String(call[0]).includes("/backlog"))).toBe(false);
    });
    it("giữ mã lỗi và thông điệp BE", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: { code: "FORBIDDEN", message: "Không có quyền" } }, 403)));
        await expect(apiGet("/api/payroll/bank-accounts")).rejects.toMatchObject({ code: "FORBIDDEN", message: "Không có quyền", status: 403 });
    });
    it("refresh một lần cho hai yêu cầu đồng thời rồi thử lại từng yêu cầu", async () => {
        let release!: (res: Response) => void;
        const refreshed = new Promise<Response>(resolve => { release = resolve; });
        const hits = new Map<string, number>();
        const fetch = vi.fn(async (url: string, init?: RequestInit) => { void init;
            if (url.endsWith("/api/auth/refresh")) return refreshed;
            const count = (hits.get(url) || 0) + 1;
            hits.set(url, count);
            return count === 1 ? response({ error: { code: "UNAUTHORIZED" } }, 401) : response({ data: { ok: true } });
        });
        vi.stubGlobal("fetch", fetch);
        const first = apiGet("/api/branches"), second = apiGet("/api/employees");
        await vi.waitFor(() => expect(fetch.mock.calls.filter((call: unknown[]) => String(call[0]).endsWith("/api/auth/refresh"))).toHaveLength(1));
        release(response({ data: { ok: true } }));
        expect(await Promise.all([first, second])).toEqual([{ ok: true }, { ok: true }]);
        expect(fetch.mock.calls).toHaveLength(5);
        expect(fetch.mock.calls.find((call: unknown[]) => String(call[0]).endsWith("/api/auth/refresh"))?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ clientPlatform: "web" }) });
    });
    it("refresh thất bại trả lỗi 401 và không lặp vô hạn", async () => {
        const fetch = vi.fn().mockResolvedValue(response({ error: { code: "UNAUTHORIZED", message: "Phiên hết hạn" } }, 401));
        vi.stubGlobal("fetch", fetch);
        await expect(apiGet("/api/employees")).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
        expect(fetch).toHaveBeenCalledTimes(2);
    });
    it("login sai mật khẩu không gọi refresh", async () => {
        const fetch = vi.fn().mockResolvedValue(response({ error: { code: "UNAUTHORIZED", message: "Sai mật khẩu" } }, 401));
        vi.stubGlobal("fetch", fetch);
        await expect(apiPost("/api/auth/login", { email: "admin@example.test", password: "wrong", clientPlatform: "web" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("tạo lệnh chi giữ nguyên payslipIds và khóa chống trùng", async () => {
        const fetch = vi.fn().mockResolvedValue(response({ data: { id: "payout", bankReference: "GD-000001" } }));
        vi.stubGlobal("fetch", fetch);
        const payload = { payslipIds: ["11111111-1111-4111-8111-111111111111"], debitAccountId: "22222222-2222-4222-8222-222222222222", idempotencyKey: "retry-key", content: "Chi lương" };
        await createPayout(payload);
        expect(fetch).toHaveBeenCalledWith(GATEWAY_URL + "/api/payroll/payouts", expect.objectContaining({ body: JSON.stringify(payload) }));
    });
    it("SOAP Fault HTTP 200 vẫn là lỗi và giải mã thông điệp XML", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response('<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><soap:Fault><faultcode>soap:Client</faultcode><faultstring>Thiếu số dư &amp; bị từ chối</faultstring></soap:Fault></soap:Body></soap:Envelope>')));
        await expect(postSoapPayroll("<request/>")).rejects.toMatchObject({ code: "SOAP_FAULT", status: 200, message: "Thiếu số dư & bị từ chối" });
    });
    it("SOAP giữ XML thành công và từ chối HTTP lỗi hoặc XML hỏng", async () => {
        const xml = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><PayoutResponse><transactionId>id</transactionId></PayoutResponse></soap:Body></soap:Envelope>';
        const fetch = vi.fn().mockResolvedValueOnce(response(xml)).mockResolvedValueOnce(response("Unavailable", 503)).mockResolvedValueOnce(response("broken xml"));
        vi.stubGlobal("fetch", fetch);
        expect(await postSoapPayroll("<request/>")).toBe(xml);
        expect(fetch.mock.calls[0][1]).toMatchObject({ headers: { "Content-Type": "text/xml; charset=utf-8" }, body: "<request/>" });
        await expect(postSoapPayroll("<request/>")).rejects.toMatchObject({ code: "HTTP_503" });
        await expect(postSoapPayroll("<request/>")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    });
});

