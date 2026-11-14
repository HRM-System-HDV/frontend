import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateTaskModal from "./TaskForm";
import TaskDetailModal from "./TaskDetail";
import type { Employee } from "@/types";
import type { TaskItem } from "./types";

describe("task deadlines and proof metadata", () => {
  it("submits the selected deadline as a timestamp and only offers personal assignment", () => {
    const onCreated = vi.fn();
    const employee = { id: "employee-1", email: "nv@example.test", name: "Nhân viên A", branchId: "branch-1" } as Employee;
    render(<CreateTaskModal open onClose={vi.fn()} employees={[employee]} currentBranch="branch-1" currentUserName="Quản lý" onCreated={onCreated} />);
    expect(screen.queryByText("Phân loại nguồn việc")).not.toBeInTheDocument();
    expect(screen.queryByText("Ca làm việc áp dụng")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Kiểm tra nhiệt độ/), { target: { value: "Kiểm kho" } });
    fireEvent.change(document.querySelector('input[type="datetime-local"]')!, { target: { value: "2026-11-15T17:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo & Giao việc" }));
    const task = onCreated.mock.calls[0][0];
    expect(task.assignedToId).toBe(employee.id);
    expect(task.dueDate).toBe(new Date(2026, 10, 15, 17, 30).toISOString());
  });

  const task: TaskItem = {
    id: "task-1", title: "Kiểm kho", description: "", assignedByName: "Quản lý",
    branch: "branch-1", dueDate: "2026-11-15T10:30:00.000Z", status: "completed",
    priority: "normal", assignedToName: "Người được giao",
    createdAt: "2026-11-13T00:00:00Z", completedAt: "2026-11-14T00:00:00Z",
    requirePhoto: true, proofPhotoUrl: "/proof.jpg", photoSubmittedByName: "Người thực sự nộp",
  };

  it("shows the resolved submitter name and does not invent a missing submission time", () => {
    render(<TaskDetailModal open onClose={vi.fn()} task={task} onComplete={vi.fn()} />);
    expect(screen.getByText("Người thực sự nộp")).toBeInTheDocument();
    expect(screen.getByText("Thời gian nộp ảnh:")).toBeInTheDocument();
    expect(screen.getByText("Chưa có thông tin")).toBeInTheDocument();
    expect(screen.queryByText("Nguồn gốc công việc:")).not.toBeInTheDocument();
  });

  it("does not substitute the assignee for an unknown submitter", () => {
    render(<TaskDetailModal open onClose={vi.fn()} task={{ ...task, photoSubmittedByName: null }} onComplete={vi.fn()} />);
    expect(screen.getAllByText("Chưa có thông tin")).toHaveLength(2);
    expect(screen.getAllByText("Người được giao")).toHaveLength(1);
  });
});
