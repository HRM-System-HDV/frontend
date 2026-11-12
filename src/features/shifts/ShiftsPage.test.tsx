import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ShiftsPage from "@/app/dashboard/shifts/page";
import { apiGet } from "@/lib/api";
const session = vi.hoisted(() => ({ role: "manager", branchId: "branch-1" }));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: () => session }));
vi.mock("@/lib/api", () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
describe("Quyền cấu hình chấm công", () => {
 beforeEach(() => { vi.clearAllMocks(); session.role = "manager"; vi.mocked(apiGet).mockResolvedValue([]); });
 it("manager không thấy tab và không đọc endpoint cấu hình", async () => {
  render(<ShiftsPage/>);
  await screen.findByRole("button", { name: "Phân ca" });
  expect(screen.queryByRole("tab", { name: "Cấu hình" })).not.toBeInTheDocument();
  expect(vi.mocked(apiGet).mock.calls.some(([path]) => path === "/api/attendance/config")).toBe(false);
 });
 it("admin có tab cấu hình và giữ lỗi tải dữ liệu để thử lại", async () => {
  session.role = "admin"; vi.mocked(apiGet).mockRejectedValue(new Error("Không thể kết nối máy chủ"));
  render(<ShiftsPage/>);
  expect(screen.getByRole("tab", { name: "Cấu hình" })).toBeInTheDocument();
  await screen.findByRole("button", { name: "Thử lại" });
  const previousCalls = vi.mocked(apiGet).mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await waitFor(() => expect(vi.mocked(apiGet).mock.calls.length).toBeGreaterThan(previousCalls));
 });
});
