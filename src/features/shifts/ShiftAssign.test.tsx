import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ShiftAssign from "./ShiftAssign";
import { apiGet } from "@/lib/api";
import type { Employee, ShiftTemplate } from "@/types";
vi.mock("@/lib/api", () => ({ apiGet: vi.fn() }));
const employee: Employee = { id: "employee-uuid", employeeCode: "NV01", name: "Nguyễn An", email: "an@example.test", branchId: "branch-uuid", departmentId: null, positionId: null, status: "đang làm", salaryType: "hourly", salary: "30000", standardWorkDays: null };
const template: ShiftTemplate = { id: "template-uuid", templateCode: "SANG", name: "Ca sáng", startTime: "07:00", endTime: "12:00" };
describe("Kiểm tra phân trùng ca", () => {
 beforeEach(() => vi.clearAllMocks());
 it("khóa ca mẫu đã được phân cho nhân viên trong ngày", async () => {
  vi.mocked(apiGet).mockResolvedValue([{ id: "existing", employeeId: employee.id, workDate: "2026-11-14", templateId: template.id, scheduledStart: "07:00", scheduledEnd: "12:00", status: "đang làm" }]);
  const onSave = vi.fn(); render(<ShiftAssign employees={[employee]} templates={[template]} date="2026-11-14" onClose={vi.fn()} onSave={onSave}/>);
  fireEvent.change(screen.getByLabelText("Nhân viên"), { target: { value: employee.id } });
  await waitFor(() => expect(screen.getByRole("option", { name: /Đã được phân/ })).toBeDisabled());
  expect(apiGet).toHaveBeenCalledWith("/api/shifts?employeeId=employee-uuid&workDate=2026-11-14");
  fireEvent.change(screen.getByLabelText("Ca mẫu"), { target: { value: template.id } });
  expect(screen.getByRole("button", { name: "Lưu phân ca" })).toBeDisabled(); expect(onSave).not.toHaveBeenCalled();
 });
});
