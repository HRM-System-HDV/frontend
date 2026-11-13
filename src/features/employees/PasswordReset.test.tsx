import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResetPasswordModal from "./PasswordReset";
import type { Employee } from "@/types";

const { apiPost, MockGatewayError } = vi.hoisted(() => {
  class GatewayError extends Error {}
  return { apiPost: vi.fn(), MockGatewayError: GatewayError };
});
vi.mock("@/lib/api", () => ({ apiPost, GatewayError: MockGatewayError }));

const employee = { id: "emp-1", name: "Nguyễn Văn A", email: "a@example.com" } as Employee;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ResetPasswordModal", () => {
  it("requests a temp password from the BE and shows what it returned", async () => {
    apiPost.mockResolvedValue({ ok: true, email: "a@example.com", tempPassword: "Temp-Pass_123" });
    render(<ResetPasswordModal employee={employee} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cấp mật khẩu tạm" }));
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/api/auth/reset-password", { email: "a@example.com" })
    );
    expect(await screen.findByText("Temp-Pass_123")).toBeInTheDocument();
  });

  it("surfaces the BE error message and keeps the retry button", async () => {
    apiPost.mockRejectedValue(new MockGatewayError("Bạn không có quyền thực hiện thao tác này"));
    render(<ResetPasswordModal employee={employee} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cấp mật khẩu tạm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Bạn không có quyền thực hiện thao tác này");
    expect(screen.getByRole("button", { name: "Cấp mật khẩu tạm" })).toBeInTheDocument();
  });
});
