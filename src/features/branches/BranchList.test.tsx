import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BranchSection from "./BranchList";
import type { Branch } from "@/types";

const mockBranches: Branch[] = [
  {
    id: "br-1",
    branchCode: "quan-1",
    name: "Chi nhánh Quận 1",
    address: "123 Lê Lợi, Quận 1, TP.HCM",
    managerId: null,
    manager: "Nguyễn Văn A",
    status: "hoạt động",
    staff: 15,
  },
  {
    id: "br-2",
    branchCode: "cau-giay",
    name: "Chi nhánh Cầu Giấy",
    address: "456 Cầu Giấy, Hà Nội",
    managerId: null,
    manager: "Trần Thị B",
    status: "hoạt động",
    staff: 8,
  },
  {
    id: "br-3",
    branchCode: "hai-chau",
    name: "Chi nhánh Hải Châu",
    address: "789 Nguyễn Văn Linh, Đà Nẵng",
    managerId: null,
    manager: "Lê Văn C",
    status: "vô hiệu hóa",
    staff: 5,
  },
];

describe("BranchSection component", () => {
  it("renders all branches initially", () => {
    render(<BranchSection branches={mockBranches} onEdit={vi.fn()} />);
    expect(screen.getByText("3 chi nhánh")).toBeInTheDocument();
    expect(screen.getByText("Chi nhánh Quận 1")).toBeInTheDocument();
    expect(screen.getByText("Chi nhánh Cầu Giấy")).toBeInTheDocument();
    expect(screen.getByText("Chi nhánh Hải Châu")).toBeInTheDocument();
  });

  it("filters branches correctly when searching by name", () => {
    render(<BranchSection branches={mockBranches} onEdit={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/Tìm theo tên, địa chỉ, quản lý.../i);

    fireEvent.change(searchInput, { target: { value: "Cầu Giấy" } });

    expect(screen.getByText("1 chi nhánh")).toBeInTheDocument();
    expect(screen.getByText("Chi nhánh Cầu Giấy")).toBeInTheDocument();
    expect(screen.queryByText("Chi nhánh Quận 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Chi nhánh Hải Châu")).not.toBeInTheDocument();
  });

  it("filters branches when searching by address or manager", () => {
    render(<BranchSection branches={mockBranches} onEdit={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/Tìm theo tên, địa chỉ, quản lý.../i);

    // Tìm theo tên quản lý
    fireEvent.change(searchInput, { target: { value: "Lê Văn C" } });
    expect(screen.getByText("Chi nhánh Hải Châu")).toBeInTheDocument();
    expect(screen.queryByText("Chi nhánh Quận 1")).not.toBeInTheDocument();

    // Tìm theo địa chỉ
    fireEvent.change(searchInput, { target: { value: "Lê Lợi" } });
    expect(screen.getByText("Chi nhánh Quận 1")).toBeInTheDocument();
    expect(screen.queryByText("Chi nhánh Cầu Giấy")).not.toBeInTheDocument();
  });

  it("clears search input when clear button is clicked", () => {
    render(<BranchSection branches={mockBranches} onEdit={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/Tìm theo tên, địa chỉ, quản lý.../i);

    fireEvent.change(searchInput, { target: { value: "Quận 1" } });
    expect(screen.getByText("1 chi nhánh")).toBeInTheDocument();

    const clearButton = screen.getByTitle("Xóa tìm kiếm");
    fireEvent.click(clearButton);

    expect(screen.getByText("3 chi nhánh")).toBeInTheDocument();
    expect(screen.getByText("Chi nhánh Quận 1")).toBeInTheDocument();
    expect(screen.getByText("Chi nhánh Cầu Giấy")).toBeInTheDocument();
  });

  it("shows empty message when no branches match query", () => {
    render(<BranchSection branches={mockBranches} onEdit={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/Tìm theo tên, địa chỉ, quản lý.../i);

    fireEvent.change(searchInput, { target: { value: "Không tồn tại" } });
    expect(screen.getByText("0 chi nhánh")).toBeInTheDocument();
    expect(screen.getByText("Không tìm thấy chi nhánh phù hợp")).toBeInTheDocument();
  });
});

