import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BranchModal from "./BranchForm";
import type { Branch } from "@/types";

describe("BranchModal component", () => {
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
      slug: "hn-1",
      name: "Chi nhánh Hà Nội 1",
      address: "123 Cầu Giấy, Hà Nội",
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

    const createButton = screen.getByRole("button", { name: "Tạo" });
    fireEvent.click(createButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Chi nhánh Đống Đa",
      })
    );
  });
});
