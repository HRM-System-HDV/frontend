import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DepartmentModal from "./DepartmentForm";
import type { Department } from "@/types";

describe("DepartmentModal component", () => {
  it("renders creation title when department is null", () => {
    render(
      <DepartmentModal
        open={true}
        onClose={vi.fn()}
        department={null}
        employees={[]}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText("Thêm phòng ban mới")).toBeInTheDocument();
  });

  it("renders edit title and populates fields when department is provided", () => {
    const mockDept: Department = {
      id: "dept-1",
      name: "Phòng Công Nghệ",
      code: "IT-01",
      manager: "Trần Văn B",
      status: "hoạt động",
      staff: 8,
    };

    render(
      <DepartmentModal
        open={true}
        onClose={vi.fn()}
        department={mockDept}
        employees={[]}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Cập nhật thông tin phòng ban")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Phòng Công Nghệ")).toBeInTheDocument();
  });

  it("does not call onSave if name is empty", () => {
    const onSave = vi.fn();
    render(
      <DepartmentModal
        open={true}
        onClose={vi.fn()}
        department={null}
        employees={[]}
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
        employees={[]}
        onSave={onSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Nhập tên phòng ban.../i);
    fireEvent.change(nameInput, { target: { value: "Phòng Truyền Thông" } });

    const createButton = screen.getByRole("button", { name: "Tạo phòng ban" });
    fireEvent.click(createButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Phòng Truyền Thông",
      })
    );
  });
});
