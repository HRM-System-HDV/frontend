import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BranchModal from "./BranchForm";
import type { Branch } from "@/types";

describe("BranchModal component", () => {
  it("requires an address before creating a branch", () => {
    const onSave = vi.fn();
    render(<BranchModal open onClose={vi.fn()} branch={null} onSave={onSave} />);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "CN" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("submits the selected employee ID even when manager names are identical", () => {
    const onSave = vi.fn();
    const branch: Branch = { id: "br", name: "CN", address: "HN", managerId: "one", manager: "Cùng tên", staff: 8, status: "hoạt động" };
    render(<BranchModal open onClose={vi.fn()} branch={branch} employees={[{ id: "one", name: "Cùng tên", systemRole: "manager" }, { id: "two", name: "Cùng tên", systemRole: "admin" }]} onSave={onSave} />);
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "two" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onSave).toHaveBeenCalledWith({ id: "br", name: "CN", address: "HN", managerId: "two", status: "hoạt động" });
  });

  it("shows other branches as read-only", () => {
    render(<BranchModal open readOnly onClose={vi.fn()} branch={{ id: "br", name: "CN", address: "HN", managerId: null, manager: "", staff: 0, status: "hoạt động" }} onSave={vi.fn()} onDelete={vi.fn()} onLock={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Lưu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xóa" })).not.toBeInTheDocument();
    for (const input of screen.getAllByRole("textbox")) expect(input).toBeDisabled();
  });

  it("renders creation title when branch is null", () => {
    render(
      <BranchModal
        open={true}
        onClose={vi.fn()}
        branch={null}
        employees={[]}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText("Thêm chi nhánh")).toBeInTheDocument();
  });

  it("renders edit title and populates fields when branch is provided", () => {
    const mockBranch: Branch = {
      id: "br-1",
      branchCode: "hn-1",
      name: "Chi nhánh Hà Nội 1",
      address: "123 Cầu Giấy, Hà Nội",
      managerId: null,
      manager: "Nguyễn Văn A",
      status: "hoạt động",
      staff: 15,
    };

    render(
      <BranchModal
        open={true}
        onClose={vi.fn()}
        branch={mockBranch}
        employees={[]}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Cập nhật chi nhánh")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Chi nhánh Hà Nội 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123 Cầu Giấy, Hà Nội")).toBeInTheDocument();
  });

  it("calls onSave with updated form values when submitted", () => {
    const onSave = vi.fn();
    render(
      <BranchModal
        open={true}
        onClose={vi.fn()}
        branch={null}
        employees={[]}
        onSave={onSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Nhập tên chi nhánh.../i);
    fireEvent.change(nameInput, { target: { value: "Chi nhánh Đống Đa" } });

    fireEvent.change(screen.getByPlaceholderText(/Nhập địa chỉ chi nhánh/), { target: { value: "Địa chỉ mới" } });
    const createButton = screen.getByRole("button", { name: "Tạo" });
    fireEvent.click(createButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Chi nhánh Đống Đa",
      })
    );
  });
});
