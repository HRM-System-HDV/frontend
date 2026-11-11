import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useCurrentUser } from "./AuthContext";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

function ConsumerComponent() {
  const { user, authenticated, loading, role, branchSlug } = useCurrentUser();
  if (loading) return <div>Loading auth...</div>;
  return (
    <div>
      <span data-testid="auth-status">{authenticated ? "authenticated" : "unauthenticated"}</span>
      <span data-testid="user-name">{user.name}</span>
      <span data-testid="user-role">{role}</span>
      <span data-testid="branch-slug">{branchSlug}</span>
    </div>
  );
}

describe("AuthContext & AuthProvider", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders unauthenticated state when /api/auth/me returns 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: "UNAUTHORIZED" } }),
    } as Response);

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
    const mockUser = {
      id: "u-123",
      email: "admin@hrm.vn",
      name: "Quản Trị Viên",
      role: "admin",
      roleTitle: "Quản trị hệ thống",
      branchSlug: "hn-1",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockUser }),
    } as Response);

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
    expect(screen.getByTestId("branch-slug")).toHaveTextContent("hn-1");
  });
});
