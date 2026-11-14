import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BranchesPage from "./page";
import type { Branch } from "@/types";

const { apiGet, apiPut, apiDelete, currentUser } = vi.hoisted(() => ({ apiGet: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn(), currentUser: { role: "admin", branchId: "" } }));
vi.mock("@/lib/api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api")>(), apiGet, apiPut, apiDelete }));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: () => currentUser }));
vi.mock("@/components/ui/PageHeader", () => ({ default: ({ actions }: { actions: React.ReactNode }) => actions }));
vi.mock("@/features/branches/BranchList", () => ({ default: ({ branches, onEdit }: { branches: Branch[]; onEdit: (branch: Branch) => void }) => branches.map(branch => <button key={branch.id} onClick={() => onEdit(branch)}>{branch.name}</button>) }));

const branch = { id: "019a7a00-0000-7000-8000-000000000001", branchCode: "CN-00001", name: "Chi nhánh A", address: "Địa chỉ A", manager: "", status: "hoạt động", staff: 0 };

describe("Branch mutation IDs", () => {
  beforeEach(() => {
    currentUser.role = "admin"; currentUser.branchId = "";
    apiGet.mockReset().mockImplementation(async (path: string) => path === "/api/branches" ? [branch] : []);
    apiPut.mockReset().mockResolvedValue(branch);
    apiDelete.mockReset().mockResolvedValue({ ok: true });
  });
  it("allows a Manager to create and edit their own branch", async () => {
    currentUser.role = "manager"; currentUser.branchId = branch.id;
    render(<BranchesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Thêm chi nhánh mới/ }));
    expect(screen.getByRole("button", { name: "Tạo" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    fireEvent.click(await screen.findByRole("button", { name: branch.name }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled());
    expect(apiGet).toHaveBeenCalledWith(`/api/branches/${branch.id}/manager-candidates`);
    expect(apiGet).not.toHaveBeenCalledWith("/api/employees");
  });
  it("keeps another branch read-only for a Manager", async () => {
    currentUser.role = "manager"; currentUser.branchId = "another";
    render(<BranchesPage />);
    fireEvent.click(await screen.findByRole("button", { name: branch.name }));
    expect(screen.queryByRole("button", { name: "Lưu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xóa" })).not.toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalledWith(`/api/branches/${branch.id}/manager-candidates`);
  });
  it("updates the branch using its UUID in the route", async () => {
    render(<BranchesPage />);
    fireEvent.click(await screen.findByRole("button", { name: branch.name }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(apiPut).toHaveBeenCalledWith(`/api/branches/${branch.id}`, expect.objectContaining({ name: branch.name })));
  });
  it("deletes the branch using its UUID in the route", async () => {
    render(<BranchesPage />);
    fireEvent.click(await screen.findByRole("button", { name: branch.name }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith(`/api/branches/${branch.id}`));
  });
});
