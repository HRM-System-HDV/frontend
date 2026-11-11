import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiGet, apiPost, apiPut, apiDelete, GatewayError, GATEWAY_URL } from "./api";

describe("api client (@/lib/api)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("apiGet unwraps envelope { data: ... } successfully", async () => {
    const mockData = [{ id: "1", name: "Chi nhánh Hà Nội" }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: mockData }),
    } as Response);

    const result = await apiGet("/api/branches");
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      `${GATEWAY_URL}/api/branches`,
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("apiGet unwraps plain JSON when not in an envelope", async () => {
    const mockData = { status: "ok" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockData),
    } as Response);

    const result = await apiGet("/health");
    expect(result).toEqual(mockData);
  });

  it("apiPost sends JSON payload and unwraps data", async () => {
    const payload = { name: "Phòng IT", manager: "Nguyễn Văn A" };
    const mockCreated = { id: "d-1", ...payload };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/backlog")) {
        return { ok: true, status: 200, text: async () => "{}" } as Response;
      }
      return {
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ data: mockCreated }),
      } as Response;
    });

    const result = await apiPost("/api/departments", payload);
    expect(result).toEqual(mockCreated);
    expect(global.fetch).toHaveBeenCalledWith(
      `${GATEWAY_URL}/api/departments`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
  });

  it("apiPut sends PUT request and returns updated data", async () => {
    const payload = { name: "Chi nhánh HN-1 Updated" };
    const mockUpdated = { id: "b-1", ...payload };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/backlog")) {
        return { ok: true, status: 200, text: async () => "{}" } as Response;
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: mockUpdated }),
      } as Response;
    });

    const result = await apiPut("/api/branches/hn-1", payload);
    expect(result).toEqual(mockUpdated);
    expect(global.fetch).toHaveBeenCalledWith(
      `${GATEWAY_URL}/api/branches/hn-1`,
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("apiDelete sends DELETE request and returns result", async () => {
    const mockDeleted = { success: true };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/backlog")) {
        return { ok: true, status: 200, text: async () => "{}" } as Response;
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: mockDeleted }),
      } as Response;
    });

    const result = await apiDelete("/api/branches/hn-1");
    expect(result).toEqual(mockDeleted);
    expect(global.fetch).toHaveBeenCalledWith(
      `${GATEWAY_URL}/api/branches/hn-1`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("throws GatewayError when response status is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: { code: "NOT_FOUND", message: "Bản ghi không tồn tại" } }),
    } as Response);

    await expect(apiGet("/api/branches/unknown")).rejects.toThrow(GatewayError);
    await expect(apiGet("/api/branches/unknown")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Bản ghi không tồn tại",
      status: 404,
    });
  });

  it("handles 401 UNAUTHORIZED correctly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Phiên hết hạn" } }),
    } as Response);

    await expect(apiGet("/api/protected")).rejects.toThrow(GatewayError);
  });

  it("401 -> gọi /api/auth/refresh rồi thử lại đúng một lần", async () => {
    const urls: string[] = [];
    let protectedHits = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      urls.push(url);
      if (url.includes("/api/auth/refresh")) {
        return { ok: true, status: 200, text: async () => "{}" } as Response;
      }
      protectedHits += 1;
      if (protectedHits === 1) {
        return {
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Hết hạn" } }),
        } as Response;
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({ data: { ok: true } }) } as Response;
    });

    const result = await apiGet("/api/protected");
    expect(result).toEqual({ ok: true });
    expect(urls).toEqual([
      `${GATEWAY_URL}/api/protected`,
      `${GATEWAY_URL}/api/auth/refresh`,
      `${GATEWAY_URL}/api/protected`,
    ]);
  });

  it("login sai mật khẩu (401 trên /api/auth/*) không bị mang đi refresh", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Sai mật khẩu" } }),
    } as Response);

    await expect(apiPost("/api/auth/login", { email: "a@b.c", password: "x" })).rejects.toThrow(GatewayError);
    const refreshCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter((c: unknown[]) =>
      String(c[0]).includes("/api/auth/refresh")
    );
    expect(refreshCalls).toHaveLength(0);
  });
});
