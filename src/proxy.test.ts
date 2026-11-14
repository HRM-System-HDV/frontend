import { describe, it, expect, vi } from "vitest";
import { proxy } from "./proxy";
import type { NextRequest } from "next/server";

const DAY = 86_400_000;

/**
 * proxy.ts giải mã payload bằng Buffer (chỉ có ở runtime Node của middleware),
 * nên test này bắt buộc chạy trên Node thay vì jsdom.
 */
vi.mock("next/server", async () => {
  const { NextResponse } = await vi.importActual<
    typeof import("next/server")
  >("next/server");
  (globalThis as { Buffer?: unknown }).Buffer = Buffer;
  return { NextResponse };
});

/** proxy chỉ đọc payload để xem exp, không verify chữ ký -> token giả đủ dùng cho test. */
function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function jwt(expMsFromNow: number): string {
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    userId: "u-1",
    role: "admin",
    exp: Math.floor((Date.now() + expMsFromNow) / 1000),
  })}.sig`;
}

function request(pathname: string, cookies: Record<string, string>): NextRequest {
  return {
    nextUrl: new URL(`http://localhost:3000${pathname}`),
    url: `http://localhost:3000${pathname}`,
    cookies: {
      get: (name: string) =>
        cookies[name] === undefined ? undefined : { name, value: cookies[name] },
    },
  } as unknown as NextRequest;
}

function location(res: Response): string | null {
  return res.headers.get("location");
}

function queryParams(res: Response): URLSearchParams {
  return new URL(location(res) ?? "about:blank").searchParams;
}

describe("proxy (route guard)", () => {
  const liveAccess = { "hrm-session": jwt(DAY), "hrm-refresh": jwt(7 * DAY) };

  it("access token còn hạn -> mở /dashboard bình thường", () => {
    expect(location(proxy(request("/dashboard/employees", liveAccess)))).toBeNull();
  });

  it("access token hết hạn nhưng refresh còn hạn -> KHÔNG đá về login", () => {
    const res = proxy(request("/dashboard/employees", {
      "hrm-session": jwt(-DAY),
      "hrm-refresh": jwt(7 * DAY),
    }));
    expect(location(res)).toBeNull();
  });

  it("hết cả hai token -> về login kèm expired=1 để hiện thông báo", () => {
    const res = proxy(request("/dashboard/employees", {
      "hrm-session": jwt(-DAY),
      "hrm-refresh": jwt(-DAY),
    }));
    const params = queryParams(res);
    expect(new URL(location(res)!).pathname).toBe("/login");
    expect(params.get("expired")).toBe("1");
    expect(params.get("from")).toBe("/dashboard/employees");
    expect(res.headers.get("set-cookie")).toContain("hrm-session=;");
  });

  it("chưa từng đăng nhập -> về login, không bịa thông báo hết phiên", () => {
    const res = proxy(request("/dashboard/employees", {}));
    const params = queryParams(res);
    expect(new URL(location(res)!).pathname).toBe("/login");
    expect(params.get("expired")).toBeNull();
  });

  it("đã đăng nhập mà mở /login -> nhảy vào dashboard", () => {
    expect(new URL(location(proxy(request("/login", liveAccess)))!).pathname).toBe(
      "/dashboard"
    );
  });

  it("chỉ còn refresh cookie khi đang ở /login -> ở lại login (tránh vòng lặp)", () => {
    const res = proxy(request("/login", {
      "hrm-session": jwt(-DAY),
      "hrm-refresh": jwt(7 * DAY),
    }));
    expect(location(res)).toBeNull();
  });
});
