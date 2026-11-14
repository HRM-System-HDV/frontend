import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RequestsPage from "./page";

const { apiGet, apiPut, apiDelete, currentUser } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  currentUser: { role: "manager", branchId: "" },
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiGet,
  apiPut,
  apiDelete,
}));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: () => currentUser }));

const branchId = "019a7a00-0000-7000-8000-000000000001";
const employeeId = "019a7a00-0000-7000-8000-000000000002";

// Một đơn mỗi lần render: bảng không hiển thị tiêu đề nên nhiều dòng sẽ không phân biệt được.
const pendingRequest = (overrides: Record<string, unknown> = {}) => ({
  id: "019a7a00-0000-7000-8000-000000000009",
  type: "shift_swap",
  employeeId,
  branchId,
  title: "Nhờ đổi ca sáng thứ 2",
  content: "Việc gia đình",
  status: "pending",
  createdAt: "2026-11-14T02:00:00.000Z",
  shiftSwapMode: "mutual_acceptance",
  ...overrides,
});

const renderWithRequest = async (overrides: Record<string, unknown> = {}, openDetail = true) => {
  const row = pendingRequest(overrides);
  // Manager bị ghim chi nhánh nên trang gọi /api/requests?branchId=...
  apiGet.mockImplementation(async (path: string) =>
    path.startsWith("/api/requests")
      ? [row]
      : path === "/api/employees"
        ? [{ id: employeeId, name: "Nguyễn Văn A" }]
        : path === "/api/branches"
          ? [{ id: branchId, name: "Hà Nội 1", branchCode: "CN-00001" }]
          : null,
  );
  render(<RequestsPage />);
  if (openDetail) fireEvent.click(await screen.findByRole("button", { name: "Chi tiết" }));
  else await screen.findByText("Không có yêu cầu nào");
  return row;
};

const reviewButtons = () =>
  screen.queryAllByRole("button", { name: /Từ chối|Phê duyệt|Duyệt đồng ý hộ/ });

describe("Requests page — quyền duyệt theo chế độ đổi ca", () => {
  beforeEach(() => {
    currentUser.role = "manager";
    currentUser.branchId = branchId;
    apiGet.mockReset();
    apiDelete.mockReset().mockResolvedValue({ deleted: true });
    apiPut.mockReset().mockResolvedValue({ ok: true });
    localStorage.clear();
  });

  it("hides approve/reject from a Manager on a mutual_acceptance swap and explains why", async () => {
    await renderWithRequest({ shiftSwapMode: "mutual_acceptance" });

    expect(await screen.findByText("Đơn đổi ca này do nhân viên được nhờ tự phản hồi.")).toBeInTheDocument();
    expect(reviewButtons()).toHaveLength(0);
    expect(apiPut).not.toHaveBeenCalled();
  });

  it("keeps the controls for an admin, who is the only role the gateway lets review that swap", async () => {
    currentUser.role = "admin";
    await renderWithRequest({ shiftSwapMode: "mutual_acceptance" });

    expect(await screen.findByRole("button", { name: /Duyệt đồng ý hộ/ })).toBeInTheDocument();
    expect(screen.queryByText("Đơn đổi ca này do nhân viên được nhờ tự phản hồi.")).not.toBeInTheDocument();
  });

  it("keeps the controls for a Manager on a manager_approval swap", async () => {
    await renderWithRequest({ shiftSwapMode: "manager_approval" });

    expect(await screen.findByRole("button", { name: /Duyệt đồng ý hộ/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Từ chối" })).toBeInTheDocument();
    expect(screen.queryByText("Đơn đổi ca này do nhân viên được nhờ tự phản hồi.")).not.toBeInTheDocument();
  });

  it("keeps the controls for a Manager on the other request types", async () => {
    await renderWithRequest({ type: "leave", shiftSwapMode: null, leaveStartDate: "2026-11-20", leaveEndDate: "2026-11-22" });

    expect(await screen.findByRole("button", { name: "Phê duyệt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Từ chối" })).toBeInTheDocument();
  });

  it("approves through the existing endpoint when the control is rendered", async () => {
    currentUser.role = "admin";
    const row = await renderWithRequest({ shiftSwapMode: "mutual_acceptance" });
    const target = await screen.findByRole("button", { name: /Duyệt đồng ý hộ/ });

    fireEvent.click(target);

    await waitFor(() =>
      expect(apiPut).toHaveBeenCalledWith(`/api/requests/${row.id}/approve`, {
        reviewNote: "Đã duyệt yêu cầu",
      }),
    );
  });
});

describe("request deletion", () => {
  beforeEach(() => {
    currentUser.role = "manager"; currentUser.branchId = branchId;
    apiGet.mockReset(); apiDelete.mockReset().mockResolvedValue({ deleted: true }); localStorage.clear();
  });
  it("confirms before deleting a pending request and removes it from the list", async () => {
    const row = await renderWithRequest();
    fireEvent.click(await screen.findByRole("button", { name: "Xóa đơn" }));
    expect(apiDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    await waitFor(() => expect(apiDelete).toHaveBeenCalledExactlyOnceWith(`/api/requests/${row.id}`));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Chi tiết" })).not.toBeInTheDocument());
    expect(screen.getByText("Đã xóa đơn yêu cầu")).toBeInTheDocument();
  });
  it("cancelling does not send a delete request", async () => {
    await renderWithRequest();
    fireEvent.click(await screen.findByRole("button", { name: "Xóa đơn" }));
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(apiDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Xóa đơn" })).toBeInTheDocument();
  });
  it("keeps the record and shows server errors if deletion fails", async () => {
    apiDelete.mockRejectedValueOnce(new Error("Đơn đã được xử lý"));
    await renderWithRequest();
    fireEvent.click(await screen.findByRole("button", { name: "Xóa đơn" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận xóa" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Đơn đã được xử lý");
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.getByRole("button", { name: "Chi tiết" })).toBeInTheDocument();
  });
  it.each(["approved", "rejected"])("does not offer deletion for %s requests", async status => {
    await renderWithRequest({ status });
    expect(screen.queryByRole("button", { name: "Xóa đơn" })).not.toBeInTheDocument();
  });
  it("does not offer a manager deletion outside their branch", async () => {
    await renderWithRequest({ branchId: "other-branch" }, false);
    expect(screen.queryByRole("button", { name: "Xóa đơn" })).not.toBeInTheDocument();
  });
});
