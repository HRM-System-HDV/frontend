import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeesPage from "./page";
import type { Employee } from "@/types";
const { apiGet, apiPost, apiPut, currentUser } = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), currentUser: { role: "admin", branchId: "branch", user: { userId: "actor", email: "actor@test.vn" } } }));
vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiGet, apiPost, apiPut }));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: () => currentUser }));
vi.mock("@/components/ui/PageHeader", () => ({ default: ({ actions }: { actions: React.ReactNode }) => actions }));
vi.mock("@/features/employees/EmployeeList", () => ({ default: ({ employees, onOpenDetail }: { employees: Employee[]; onOpenDetail: (e: Employee) => void }) => employees.map(e => <button key={e.id} onClick={() => onOpenDetail(e)}>{e.name}</button>) }));
const employee = { id: "employee", name: "Nhân viên A", email: "a@test.vn", branchId: "branch", departmentId: "department", positionId: "position", phone: "", salaryType: "monthly", salary: "8500000", standardWorkDays: 24, status: "đang làm" };
const account = { id: "account", employeeId: employee.id, systemRole: "staff" };
const selectOption = (label: string, value: string) => fireEvent.change(screen.getByRole("option", { name: label }).parentElement!, { target: { value } });
async function openCreate() {
  render(<EmployeesPage />);
  await screen.findByRole("button", { name: employee.name });
  fireEvent.click(screen.getByRole("button", { name: /Thêm nhân viên mới/ }));
  fireEvent.change(screen.getByPlaceholderText("Họ và tên nhân viên"), { target: { value: "Bình" } });
  fireEvent.change(screen.getByPlaceholderText("nv@company.com"), { target: { value: "binh@test.vn" } });
  fireEvent.change(screen.getByPlaceholderText("Nhập số công thỏa thuận"), { target: { value: "22" } });
  selectOption("Kế toán (KT)", "position");
}
describe("Employee page contract", () => {
  beforeEach(() => {
    localStorage.clear(); vi.resetAllMocks(); currentUser.role = "admin";
    apiGet.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/employees/")) return employee;
      if (path.startsWith("/api/employees")) return [employee];
      if (path === "/api/branches") return [{ id: "branch", name: "Chi nhánh A" }];
      if (path === "/api/departments") return [{ id: "department", name: "Phòng A", departmentCode: "PA" }];
      if (path === "/api/positions") return [{ id: "position", name: "Kế toán", positionCode: "KT", departmentId: "department" }];
      if (path === "/api/auth/users") return [account];
      return [];
    });
    apiPost.mockResolvedValue(employee);
    apiPut.mockImplementation(async (path: string, body: object) => path.startsWith("/api/auth/") ? { ...account, ...body } : { ...employee, ...body });
  });
  it("creates with salary and catalog IDs, then assigns role via account API", async () => {
    await openCreate();
    selectOption("Quản lý Chi nhánh", "manager");
    fireEvent.click(screen.getByRole("button", { name: "Tạo" }));
    await waitFor(() => expect(apiPut).toHaveBeenCalledWith("/api/auth/users/account", { systemRole: "manager" }));
    const payload = apiPost.mock.calls[0][1];
    expect(payload).toMatchObject({ salary: "8500000", standardWorkDays: 22, departmentId: "department", positionId: "position", branchId: "branch" });
    for (const key of ["department", "role", "baseSalary", "hourlySalary", "systemRole"]) expect(payload).not.toHaveProperty(key);
  });
  it("reports role failure after creation and closes the create form to avoid duplicate retries", async () => {
    apiPut.mockRejectedValue(new Error("Identity unavailable"));
    await openCreate(); selectOption("Quản trị viên", "admin");
    fireEvent.click(screen.getByRole("button", { name: "Tạo" }));
    await screen.findByText(/Đã tạo hồ sơ. Chưa cấp được quyền/);
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Tạo" })).not.toBeInTheDocument();
  });
  it("updates existing employee using IDs/salary, with role changed through account ID", async () => {
    render(<EmployeesPage />);
    fireEvent.click(await screen.findByRole("button", { name: employee.name }));
    fireEvent.click(await screen.findByRole("button", { name: "Sửa" }));
    fireEvent.click(await screen.findByRole("button", { name: /2. Công tác/ }));
    selectOption("Quản lý Chi nhánh", "manager");
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(apiPut).toHaveBeenCalledWith("/api/auth/users/account", { systemRole: "manager" }));
    const payload = apiPut.mock.calls.find(([path]) => path === "/api/employees/employee")![1];
    expect(payload).toMatchObject({ salary: "8500000", standardWorkDays: 24, departmentId: "department", positionId: "position" });
    expect(payload).not.toHaveProperty("systemRole");
  });
  it("Manager never loads or updates privileged account APIs", async () => {
    currentUser.role = "manager"; await openCreate();
    expect(screen.getByRole("option", { name: "Quản trị viên" }).parentElement).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Tạo" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    expect(apiGet).not.toHaveBeenCalledWith("/api/auth/users"); expect(apiPut).not.toHaveBeenCalled();
  });
  it("shows resignation status/date from BE and hides disable/resign actions", async () => {
    apiGet.mockImplementation(async (path: string) => path === "/api/employees" ? [{ ...employee, status: "nghỉ việc", resignedAt: "13/11/2026" }] : path === "/api/employees/employee" ? { ...employee, status: "nghỉ việc", resignedAt: "13/11/2026" } : []);
    render(<EmployeesPage />);
    fireEvent.click(await screen.findByRole("button", { name: employee.name }));
    fireEvent.click(await screen.findByRole("button", { name: /2. Công tác/ }));
    expect(await screen.findByText("13/11/2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nghỉ việc" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vô hiệu hóa" })).not.toBeInTheDocument();
  });
});
