import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CatalogForm } from "./CatalogPage";

describe("Canonical organization forms", () => {
  it("requires a department code and uses manager UUID references", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<CatalogForm kind="departments" row={null} employees={[]} departments={[]} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Tên"), { target: { value: "Kỹ thuật" } });
    fireEvent.click(screen.getByText("Lưu"));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Mã nghiệp vụ"), { target: { value: "DEPT-IT" } });
    fireEvent.click(screen.getByText("Lưu"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ name: "Kỹ thuật", departmentCode: "DEPT-IT", managerId: null, status: "hoạt động" }));
  });
  it("sends position department IDs rather than names", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const departmentId = "019a7680-0000-7000-8000-000000000001";
    render(<CatalogForm kind="positions" row={null} employees={[]} departments={[{ id: departmentId, departmentCode: "DEPT-IT", name: "Kỹ thuật", status: "hoạt động" }]} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Tên"), { target: { value: "Lập trình viên" } });
    fireEvent.change(screen.getByLabelText("Mã nghiệp vụ"), { target: { value: "POS-DEV" } });
    fireEvent.change(screen.getByLabelText("Phòng ban"), { target: { value: departmentId } });
    fireEvent.click(screen.getByText("Lưu"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ name: "Lập trình viên", positionCode: "POS-DEV", departmentId, status: "hoạt động" }));
  });
});
