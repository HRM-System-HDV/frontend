import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DepartmentModal from "./DepartmentForm";
import type { Department } from "@/types";
import { apiGet } from "@/lib/api";
import DepartmentList from "./DepartmentList";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn().mockResolvedValue([]) }));

describe("DepartmentModal component", () => {
  it("uses department candidates across branches and saves the selected employee ID", async () => {
    vi.mocked(apiGet).mockResolvedValueOnce([{ id: "outside-employee", name: "Nhân viên chi nhánh khác" }]);
    const onSave = vi.fn();
    render(<DepartmentModal open onClose={vi.fn()} department={{ id: "dept-1", departmentCode: "IT", name: "IT", manager: "", status: "hoạt động" }} onSave={onSave} />);
    await screen.findByRole("option", { name: "Nhân viên chi nhánh khác" });
    expect(apiGet).toHaveBeenCalledWith("/api/departments/dept-1/manager-candidates");
    const option = screen.getByRole("option", { name: "Nhân viên chi nhánh khác" });
    await waitFor(() => expect(option.parentElement).not.toBeDisabled());
    fireEvent.change(option.parentElement!, { target: { value: "outside-employee" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ managerId: "outside-employee" }));
  });

  it("displays the backend count and responsible person's name", () => {
    render(<DepartmentList departments={[{ id: "dept-1", departmentCode: "IT", name: "IT", manager: "Người phụ trách", staff: 7, status: "hoạt động" }]} onEdit={vi.fn()} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Người phụ trách")).toBeInTheDocument();
  });
  it("renders creation title when department is null", () => {
    render(
      <DepartmentModal
        open={true}
        onClose={vi.fn()}
        department={null}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText("Thêm phòng ban mới")).toBeInTheDocument();
  });

  it("renders edit title and populates fields when department is provided", async () => {
    const mockDept: Department = {
      id: "dept-1",
      name: "Phòng Công Nghệ",
      departmentCode: "IT-01",
      manager: "Trần Văn B",
      status: "hoạt động",
      staff: 8,
    };

    render(
      <DepartmentModal
        open={true}
        onClose={vi.fn()}
        department={mockDept}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Cập nhật thông tin phòng ban")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Phòng Công Nghệ")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole("combobox")[0]).not.toBeDisabled());
  });

  it("does not call onSave if name is empty", () => {
    const onSave = vi.fn();
    render(
      <DepartmentModal
        open={true}
        onClose={vi.fn()}
        department={null}
        onSave={onSave}
      />
    );

    const createButton = screen.getByRole("button", { name: "Tạo phòng ban" });
    fireEvent.click(createButton);

    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave when valid name is entered", () => {
    const onSave = vi.fn();
    render(
      <DepartmentModal
        open={true}
        onClose={vi.fn()}
        department={null}
        onSave={onSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Nhập tên phòng ban.../i);
    fireEvent.change(nameInput, { target: { value: "Phòng Truyền Thông" } });
    fireEvent.change(screen.getByPlaceholderText("VD: PB-001"), { target: { value: "PB-TT" } });

    const createButton = screen.getByRole("button", { name: "Tạo phòng ban" });
    fireEvent.click(createButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Phòng Truyền Thông",
      })
    );
  });
});
