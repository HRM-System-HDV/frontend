import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PayslipsPage from "./page";
import type { Payslip } from "@/types";
const { apiGet, apiPost } = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiGet, apiPost }));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: () => ({ role: "admin", name: "Admin" }) }));
vi.mock("@/components/ui/PageHeader", () => ({ default: () => null }));
vi.mock("@/features/payslips/PayslipExport", () => ({ default: () => null }));
vi.mock("@/features/payslips/PayslipList", () => ({ default: ({ payslips, onView }: { payslips: Payslip[]; onView: (p: Payslip) => void }) => payslips.map(p => <button key={p.id} onClick={() => onView(p)}>Chi tiết</button>) }));
const row = { id: "slip", employeeId: "employee", month: "11-2026", baseSalary: "1000000", bonus: "0", totalPenalty: "0", netSalary: "1000000", status: "pending_confirmation", workedShifts: 1 };
beforeEach(() => {
  localStorage.clear();
  apiPost.mockReset().mockResolvedValue({});
  apiGet.mockReset().mockImplementation(async (path: string) => path === "/api/payroll/payslips" ? [row] : path === "/api/payroll/payslips/slip" ? { ...row, bonus: "500000", netSalary: "1500000", adjustmentReason: "Điều chỉnh mới" } : path === "/api/employees" ? [{ id: "employee", name: "Nhân viên A" }] : []);
});
it("opens the editor with fresh payslip amounts from the ID endpoint", async () => {
  render(<PayslipsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Chi tiết" }));
  expect(await screen.findByDisplayValue("500000")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Điều chỉnh mới")).toBeInTheDocument();
  expect(apiGet).toHaveBeenCalledWith("/api/payroll/payslips/slip");
});
it("opens a now-confirmed payslip read-only instead of editing stale data", async () => {
  apiGet.mockImplementation(async (path: string) => path === "/api/payroll/payslips" ? [row] : path === "/api/payroll/payslips/slip" ? { ...row, status: "confirmed" } : path === "/api/employees" ? [{ id: "employee", name: "Nhân viên A" }] : []);
  render(<PayslipsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Chi tiết" }));
  expect(await screen.findByText("PHIẾU LƯƠNG NHÂN VIÊN")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Lưu thay đổi" })).not.toBeInTheDocument();
});

it("confirms a payslip with POST confirm", async () => {
  render(<PayslipsPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Chi tiết" }));
  fireEvent.click(await screen.findByRole("button", { name: "Chốt phiếu lương" }));
  fireEvent.click(await screen.findByRole("button", { name: "Xác nhận chốt" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/payroll/payslips/slip/confirm", {}));
});
