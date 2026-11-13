import { beforeEach, describe, expect, it, vi } from "vitest";
import { assignEmployeeRole, employeePayload, normalizeEmployee } from "./contract";
import type { Employee, Department, Position } from "@/types";
const { apiGet, apiPut } = vi.hoisted(() => ({ apiGet: vi.fn(), apiPut: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet, apiPut }));
const row: Employee = { id: "emp", name: "An", email: "a@test.vn", phone: "", department: "Tên cũ", role: "Chức danh cũ", departmentId: "d2", positionId: "p2", systemRole: "admin", status: "đang làm", salaryType: "monthly", salary: "8500000", standardWorkDays: 24 };
describe("Employee contract", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it("maps catalog IDs and Identity account role without trusting display-name fields", () => {
    const departments = [{ id: "d1", name: "Trùng tên" }, { id: "d2", name: "Trùng tên" }] as Department[];
    const positions = [{ id: "p2", name: "Kế toán" }] as Position[];
    const normalized = normalizeEmployee(row, departments, positions, [{ id: "account", employeeId: "emp", systemRole: "manager" }]);
    expect(normalized).toMatchObject({ departmentId: "d2", department: "Trùng tên", positionId: "p2", role: "Kế toán", systemRole: "manager", accountId: "account", baseSalary: 8500000 });
    expect(normalizeEmployee(row, [], []).systemRole).toBeUndefined();
  });
  it("sends one salary plus IDs and agreed work days, excluding display fields and account role", () => {
    const payload = employeePayload(row, true);
    expect(payload).toMatchObject({ salary: "8500000", standardWorkDays: 24, departmentId: "d2", positionId: "p2" });
    for (const field of ["baseSalary", "hourlySalary", "department", "role", "systemRole", "accountId", "id"]) expect(payload).not.toHaveProperty(field);
    const hourly = employeePayload({ ...row, salaryType: "hourly", salary: "35000" }, false);
    expect(hourly).toMatchObject({ salary: "35000", standardWorkDays: null });
    expect(hourly).not.toHaveProperty("email"); expect(hourly).not.toHaveProperty("branchId");
  });
  it("rejects missing/invalid monthly work days and decimal/negative salaries", () => {
    for (const days of [undefined, null, 0, -1, 2.5]) expect(() => employeePayload({ ...row, standardWorkDays: days }, true)).toThrow();
    for (const salary of ["", "-1", "1.5", "1000000000000000"]) expect(() => employeePayload({ ...row, salary }, true)).toThrow();
  });
  it("updates account by account ID, never employee ID; missing sync fails explicitly", async () => {
    apiGet.mockResolvedValue([{ id: "account", employeeId: "emp", systemRole: "staff" }]);
    apiPut.mockResolvedValue({ id: "account", employeeId: "emp", systemRole: "manager" });
    await assignEmployeeRole("emp", "manager");
    expect(apiPut).toHaveBeenCalledWith("/api/auth/users/account", { systemRole: "manager" });
    apiGet.mockResolvedValue([]);
    await expect(assignEmployeeRole("emp", "admin")).rejects.toThrow(/đã lưu/);
  });
});
