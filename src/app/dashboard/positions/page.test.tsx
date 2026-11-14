import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PositionsPage from "./page";
import type { Position } from "@/types";

const { apiGet, apiPost, apiPut, apiDelete, currentUser } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  currentUser: { role: "admin", branchId: "" },
}));
vi.mock("@/lib/api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api")>(), apiGet, apiPost, apiPut, apiDelete }));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: () => currentUser }));
vi.mock("@/components/ui/PageHeader", () => ({ default: ({ actions }: { actions: React.ReactNode }) => actions }));
vi.mock("@/features/positions/PositionList", () => ({ default: ({ positions, onEdit }: { positions: Position[]; onEdit: (position: Position) => void }) => positions.map(position => <button key={position.id} onClick={() => onEdit(position)}>{position.name}</button>) }));

const position = { id: "019a7a00-0000-7000-8000-000000000009", name: "Lập trình viên", positionCode: "POS-DEV", departmentId: "019a7a00-0000-7000-8000-000000000002", status: "hoạt động", staff: 2 };

describe("Positions page", () => {
  beforeEach(() => {
    currentUser.role = "admin";
    apiGet.mockReset().mockImplementation(async (path: string) =>
      path === "/api/positions" ? [position] : path === `/api/positions/${position.id}` ? position : path === "/api/departments" ? [{ id: position.departmentId, name: "IT", departmentCode: "PB-IT", manager: "", status: "hoạt động" }] : []);
    apiPost.mockReset().mockResolvedValue(position);
    apiPut.mockReset().mockResolvedValue(position);
    apiDelete.mockReset().mockResolvedValue({ ok: true });
  });

  it("creates a position with its business code and department ID", async () => {
    render(<PositionsPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Thêm vị trí mới/ }));
    fireEvent.change(screen.getByPlaceholderText("VD: POS-IT"), { target: { value: "POS-QA" } });
    fireEvent.change(screen.getByPlaceholderText(/Nhập tên vị trí/i), { target: { value: "Kiểm thử" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo vị trí" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/positions", expect.objectContaining({ positionCode: "POS-QA", name: "Kiểm thử" })));
  });

  it("updates and deletes using the position UUID in the route", async () => {
    render(<PositionsPage />);
    fireEvent.click(await screen.findByRole("button", { name: position.name }));
    fireEvent.click(await screen.findByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(apiPut).toHaveBeenCalledWith(`/api/positions/${position.id}`, expect.objectContaining({ positionCode: position.positionCode })));
    fireEvent.click(await screen.findByRole("button", { name: position.name }));
    fireEvent.click(await screen.findByRole("button", { name: "Xóa" }));
    expect(await screen.findByText(/2 hồ sơ nhân sự đang dùng chức danh này/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith(`/api/positions/${position.id}`));
  });

  it("blocks a Manager from the admin-only catalog page", async () => {
    currentUser.role = "manager";
    render(<PositionsPage />);
    expect(await screen.findByText("Không có quyền truy cập")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thêm vị trí mới/ })).not.toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });
});
