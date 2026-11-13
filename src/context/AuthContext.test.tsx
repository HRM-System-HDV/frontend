import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { useEffect } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

// Router và pathname phải điều khiển được từ test:AuthContext dùng usePathname
// để quyết định "đang ở dashboard mà rớt phiên" thì đá về /login.
const mockRouter = { push: vi.fn(), replace: vi.fn() };
let mockPathname = "/login";

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
}));

import { AuthProvider, useCurrentUser } from "./AuthContext";

function ConsumerComponent() {
  const { user, authenticated, loading, role, branchId } = useCurrentUser();
  if (loading) return <div>Loading auth...</div>;
  return (
    <div>
      <span data-testid="auth-status">{authenticated ? "authenticated" : "unauthenticated"}</span>
      <span data-testid="user-name">{user.name}</span>
      <span data-testid="user-role">{role}</span>
      <span data-testid="branch-id">{branchId}</span>
    </div>
  );
}

const ME_USER = {
  id: "u-123",
  email: "admin@hrm.vn",
  name: "Quản Trị Viên",
  role: "admin",
  roleTitle: "Quản trị hệ thống",
  branchId: "019a7a00-0000-7000-8000-000000000001",
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

/** Mock fetch theo URL; trả về danh sách URL đã gọi để kiểm tra số lần refresh. */
function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const calls: string[] = [];
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    return handler(url, init);
  }) as unknown as typeof fetch;
  return calls;
}

describe("AuthContext & AuthProvider", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRouter.replace.mockClear();
    mockPathname = "/login";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders unauthenticated state when /api/auth/me returns 401", async () => {
    mockFetch(async () => jsonResponse(401, { error: { code: "UNAUTHORIZED" } }));

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading auth...")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("auth-status")).toHaveTextContent("unauthenticated");
  });

  it("renders authenticated state when /api/auth/me returns user data", async () => {
    mockFetch(async () => jsonResponse(200, { data: ME_USER }));

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading auth...")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("user-name")).toHaveTextContent("Quản Trị Viên");
    expect(screen.getByTestId("user-role")).toHaveTextContent("admin");
    expect(screen.getByTestId("branch-id")).toHaveTextContent("019a7a00-0000-7000-8000-000000000001");
  });

  it("mở lại trang sau khi access token hết hạn: tự refresh rồi hỏi /me lại", async () => {
    let meCalls = 0;
    mockFetch(async (url) => {
      if (url.endsWith("/api/auth/refresh")) return jsonResponse(200, { data: { ok: true } });
      if (url.endsWith("/api/auth/me")) {
        meCalls += 1;
        return meCalls === 1
          ? jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "Phiên đăng nhập đã hết hạn" } })
          : jsonResponse(200, { data: ME_USER });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated");
    });
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("/me của lần mount trước về trễ sau khi đăng nhập xong: không được đá về /login", async () => {
    let resolveStaleMe: (res: Response) => void = () => {};
    mockFetch(async (url) => {
      if (url.endsWith("/api/auth/me")) {
        return new Promise<Response>((resolve) => {
          resolveStaleMe = resolve;
        });
      }
      if (url.endsWith("/api/auth/login")) return jsonResponse(200, { data: { user: ME_USER } });
      throw new Error(`unexpected fetch: ${url}`);
    });
    mockPathname = "/dashboard/employees";

    const loginRef: { current: null | ((email: string, password: string) => Promise<void>) } = {
      current: null,
    };
    function Probe() {
      const ctx = useCurrentUser();
      useEffect(() => {
        loginRef.current = ctx.login;
      }, [ctx.login]);
      return <ConsumerComponent />;
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    // Đăng nhập hoàn tất trong lúc /me lúc mount còn treo (gateway khởi động chậm).
    await act(async () => {
      await loginRef.current!("admin@hrm.vn", "matkhau");
    });
    expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated");

    // /me cũ (401, chưa có cookie) bây giờ mới trả về.
    await act(async () => {
      resolveStaleMe(jsonResponse(401, { error: { code: "UNAUTHORIZED" } }));
      await Promise.resolve();
    });

    expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated");
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
