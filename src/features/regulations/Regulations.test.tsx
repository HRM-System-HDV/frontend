import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Regulation } from "@/types";
import RegulationForm from "./RegulationForm";
import RegulationDetail from "./RegulationDetail";
import RegulationsPage from "@/app/dashboard/regulations/page";

const { apiGet, apiDownload, apiPost, apiPut, apiDelete, currentUser } = vi.hoisted(() => ({
  apiGet: vi.fn(), apiDownload: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn(), currentUser: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiGet, apiDownload, apiPost, apiPut, apiDelete, GatewayError: class extends Error {} }));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: currentUser }));
vi.mock("@/components/ui/PageHeader", () => ({ default: () => null }));

const base: Regulation = {
  id: "global", regulationCode: "QD-001", title: "Nội quy toàn công ty", category: "Nội quy lao động",
  summary: "Tóm tắt", content: "Nội dung", status: "hiệu lực", scopeBranchId: null,
  effectiveDate: "2026-11-13", expiryDate: "2026-11-30", version: "1.0", createdAt: "2026-11-13", updatedAt: "2026-11-13",
};
const own = { ...base, id: "own", regulationCode: "QD-002", title: "Nội quy chi nhánh", scopeBranchId: "branch-1" };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  currentUser.mockReturnValue({ role: "manager", branchId: "branch-1" });
  apiGet.mockImplementation(async (path: string) => path === "/api/branches" ? [] : path === "/api/regulations" ? [base, own] : { ...base, files: [] });
});

describe("regulations contract", () => {
  it("sends expiryDate as ISO and null when cleared", async () => {
    const onSave = vi.fn();
    render(<RegulationForm initial={own} onClose={vi.fn()} onSave={onSave} />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(screen.getByLabelText("Ngày bắt đầu hiệu lực")).toHaveValue("2026-11-13");
    expect(onSave).not.toHaveBeenCalled();
    const input = screen.getByLabelText("Ngày hết hiệu lực");
    expect(input).toHaveValue("2026-11-30");
    fireEvent.change(input, { target: { value: "2026-12-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ effectiveDate: "2026-11-13", expiryDate: "2026-12-15" }));
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ expiryDate: null }));
  });

  it("rejects an expiry before the effective date", async () => {
    const onSave = vi.fn();
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<RegulationForm initial={own} onClose={vi.fn()} onSave={onSave} />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("Ngày hết hiệu lực"), { target: { value: "2026-11-12" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalled();
    alert.mockRestore();
  });

  it.each(["manager", "staff", "admin"])("shows actions on company regulations only for admin (%s)", async role => {
    currentUser.mockReturnValue({ role, branchId: "branch-1" });
    render(<RegulationsPage />);
    fireEvent.click(await screen.findByRole("heading", { name: base.title }));
    await screen.findByText("Chưa có tài liệu đính kèm.");
    for (const name of ["Sửa văn bản", "Xóa văn bản", "Ghim đầu trang"]) {
      if (role === "admin") expect(screen.getByRole("button", { name })).toBeInTheDocument();
      else expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("allows managers to edit, delete and pin their branch regulations", async () => {
    render(<RegulationsPage />);
    fireEvent.click(await screen.findByRole("heading", { name: own.title }));
    await screen.findByText("Chưa có tài liệu đính kèm.");
    for (const name of ["Sửa văn bản", "Xóa văn bản", "Ghim đầu trang"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("loads real file metadata and downloads the actual file bytes", async () => {
    apiGet.mockImplementation(async (path: string) => path === "/api/branches" ? [] : { ...base, files: [{ id: "file-id", publicId: "hrm/regulations/actual-file", mime: "application/pdf", bytes: 2048 }] });
    const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    apiDownload.mockResolvedValue(blob);
    const create = vi.fn().mockReturnValue("blob:file");
    vi.stubGlobal("URL", class extends URL { static createObjectURL = create; static revokeObjectURL = vi.fn(); });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<RegulationDetail item={base} onClose={vi.fn()} />);
    expect(await screen.findByText(/actual-file.pdf/)).toBeInTheDocument();
    expect(screen.getByText("30/11/2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tải về (2 KB)" }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(apiDownload).toHaveBeenCalledWith("/api/files/hrm/regulations/actual-file");
    expect(create).toHaveBeenCalledWith(blob);
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
