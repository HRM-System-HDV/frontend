import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeeForm from "./EmployeeForm";

function setup() {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<EmployeeForm employee={null} branches={[]} departments={[]} positions={[]} onSave={onSave} onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Họ tên"), { target: { value: "Nguyễn An" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: " AN@EXAMPLE.COM " } });
  fireEvent.change(screen.getByLabelText("Lương thỏa thuận (VNĐ)"), { target: { value: "123456789012345" } });
  return onSave;
}
describe("EmployeeForm salary agreement", () => {
  it("requires an explicit monthly workday agreement and sends Decimal salary without legacy fields", async () => {
    const onSave = setup();
    fireEvent.change(screen.getByLabelText("Kiểu lương"), { target: { value: "monthly" } });
    fireEvent.click(screen.getByText("Lưu hồ sơ"));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Số công thỏa thuận / tháng"), { target: { value: "22" } });
    fireEvent.click(screen.getByText("Lưu hồ sơ"));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const payload = onSave.mock.calls[0][0];
    expect(payload).toMatchObject({ name: "Nguyễn An", email: "an@example.com", salaryType: "monthly", salary: "123456789012345", standardWorkDays: 22, branchId: null, departmentId: null, positionId: null });
    for (const key of ["id", "employeeCode", "systemRole", "role", "baseSalary", "hourlySalary", "branch", "department"]) expect(payload).not.toHaveProperty(key);
  });
  it("clears the monthly agreement when changing to hourly", async () => {
    const onSave = setup();
    fireEvent.change(screen.getByLabelText("Kiểu lương"), { target: { value: "monthly" } });
    fireEvent.change(screen.getByLabelText("Số công thỏa thuận / tháng"), { target: { value: "22" } });
    fireEvent.change(screen.getByLabelText("Kiểu lương"), { target: { value: "hourly" } });
    fireEvent.click(screen.getByText("Lưu hồ sơ"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ salaryType: "hourly", standardWorkDays: null })));
  });
});
