import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import BacklogPage from "./page";
import { formatDateTime } from "@/lib/utils";

const { apiGet, currentUser } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  currentUser: { role: "admin", branchId: "" },
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiGet,
}));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: () => currentUser }));
vi.mock("@/components/ui/PageHeader", () => ({
  default: ({ actions }: { actions: React.ReactNode }) => actions,
}));

const attendanceRow = {
  id: "019a7a00-0000-7000-8000-0000000000a1",
  userName: "Nguyễn Quản Lý",
  userRole: "manager",
  action: "attendance_saved",
  module: "work",
  entityType: "attendance",
  entityId: "019a7a00-0000-7000-8000-0000000000b1",
  targetName: "Trần Nhân Viên 14/11/2026",
  createdAt: "2026-11-14T02:30:00.000Z",
};
const employeeRow = {
  id: "019a7a00-0000-7000-8000-0000000000a2",
  userName: "Admin Hệ Thống",
  userRole: null,
  action: "employee_updated",
  module: "organization",
  entityType: "employee",
  entityId: "019a7a00-0000-7000-8000-0000000000b2",
  targetName: "Lê Nhân Viên",
  createdAt: "2026-11-13T09:15:00.000Z",
};

const backlogRequests = () => apiGet.mock.calls.filter(([path]) => path === "/api/backlog").length;
const dataRows = () => screen.getAllByRole("row").slice(1);
const rowWith = (needle: string) => dataRows().find((row) => within(row).queryByText(needle));

describe("Backlog page", () => {
  beforeEach(() => {
    // Bộ lọc/search lưu trong localStorage: nếu không xóa thì giá trị của test
    // trước làm lệch số dòng của test sau.
    localStorage.clear();
    currentUser.role = "admin";
    apiGet.mockReset().mockResolvedValue([attendanceRow, employeeRow]);
  });

  it("renders the created_at column that the BE actually returns", async () => {
    render(<BacklogPage />);
    expect(await screen.findByText("Nguyễn Quản Lý")).toBeInTheDocument();
    const cell = formatDateTime(attendanceRow.createdAt);
    expect(cell).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    expect(screen.getByText(cell)).toBeInTheDocument();
  });

  it("shows the raw action/module codes and keeps unknown cells honest", async () => {
    render(<BacklogPage />);
    await screen.findByText("Nguyễn Quản Lý");
    const attendance = rowWith("Trần Nhân Viên 14/11/2026") as HTMLElement;
    const employee = rowWith("Lê Nhân Viên") as HTMLElement;
    expect(within(attendance).getByText("attendance_saved")).toBeInTheDocument();
    expect(within(attendance).getByText("work")).toBeInTheDocument();
    expect(within(employee).getByText("employee_updated")).toBeInTheDocument();
    expect(within(employee).getByText("organization")).toBeInTheDocument();
    // model Backlog không có description: cột Chi tiết là "—", và userRole null
    // cũng là "—" (không bịa "Nhân viên") => đúng 2 dấu gạch trong dòng này.
    expect(within(employee).getAllByText("—")).toHaveLength(2);
  });

  it("filters on the already loaded table without re-requesting the log", async () => {
    render(<BacklogPage />);
    await screen.findByText("Nguyễn Quản Lý");
    expect(backlogRequests()).toBe(1);

    fireEvent.change(screen.getByLabelText("Lọc theo phân hệ"), { target: { value: "work" } });
    await waitFor(() => expect(dataRows()).toHaveLength(1));
    expect(within(dataRows()[0]).getByText("Nguyễn Quản Lý")).toBeInTheDocument();
    expect(backlogRequests()).toBe(1);

    fireEvent.change(screen.getByLabelText("Lọc theo phân hệ"), { target: { value: "all" } });
    await waitFor(() => expect(dataRows()).toHaveLength(2));
    expect(backlogRequests()).toBe(1);
  });

  it("searches by person and target without firing a request per keystroke", async () => {
    render(<BacklogPage />);
    await screen.findByText("Nguyễn Quản Lý");
    fireEvent.change(screen.getByLabelText("Tìm trong nhật ký thao tác"), { target: { value: "Lê Nhân" } });
    await waitFor(() => expect(dataRows()).toHaveLength(1));
    expect(within(dataRows()[0]).getByText("Lê Nhân Viên")).toBeInTheDocument();
    expect(backlogRequests()).toBe(1);
  });

  it("builds the filter options from the data instead of a hard-coded module list", async () => {
    render(<BacklogPage />);
    await screen.findByText("Nguyễn Quản Lý");
    const moduleSelect = screen.getByLabelText("Lọc theo phân hệ");
    expect(within(moduleSelect).getByRole("option", { name: "work" })).toBeInTheDocument();
    expect(within(moduleSelect).getByRole("option", { name: "organization" })).toBeInTheDocument();
    // 13 nhãn hardcode cũ ("Nhân sự", "Bảng tin", ...) không còn trong DOM.
    expect(within(moduleSelect).queryByRole("option", { name: "Nhân sự" })).not.toBeInTheDocument();
    expect(within(moduleSelect).getAllByRole("option")).toHaveLength(3);
    expect(within(screen.getByLabelText("Lọc theo thao tác")).getAllByRole("option")).toHaveLength(3);
  });

  it("offers retry when the log cannot be read", async () => {
    apiGet.mockRejectedValueOnce(new Error("mạng"));
    render(<BacklogPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(backlogRequests()).toBe(2));
    expect(await screen.findByText("Nguyễn Quản Lý")).toBeInTheDocument();
  });

  it("blocks a non-admin: gateway limits GET /api/backlog to admin", async () => {
    currentUser.role = "manager";
    render(<BacklogPage />);
    expect(await screen.findByText("Không có quyền truy cập")).toBeInTheDocument();
    expect(backlogRequests()).toBe(0);
  });
});
