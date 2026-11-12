import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaskDetail from "./TaskDetail";
import TaskForm from "./TaskForm";
import type { Task } from "@/types";
import type { TaskInput } from "./types";
const task: Task = { id: "task-1", title: "Kiểm kho", assignedTo: null, branchId: "branch-1", workDate: "2026-11-14", templateId: "template-1", status: "pending", requirePhoto: true };
describe("Thao tác công việc", () => {
 it("chặn hoàn thành khi chưa có ảnh bắt buộc và không có bước nhận việc", () => {
  const onUpdate = vi.fn(); render(<TaskDetail task={task} assignee="Ca sáng" onClose={vi.fn()} onUpdate={onUpdate} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  expect(screen.getByRole("button", { name: "Hoàn thành" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: /Nhận việc|Chấp nhận/ })).not.toBeInTheDocument();
  expect(screen.getByText("Kết quả và ảnh minh chứng được dùng chung cho cả ca.")).toBeInTheDocument();
  expect(onUpdate).not.toHaveBeenCalled();
 });
 it("cho hoàn thành không ảnh nếu task không yêu cầu và giữ lỗi khi máy chủ từ chối", async () => {
  const onUpdate = vi.fn().mockRejectedValue(new Error("Không thể lưu kết quả")), onClose = vi.fn();
  render(<TaskDetail task={{ ...task, requirePhoto: false }} assignee="Ca sáng" onClose={onClose} onUpdate={onUpdate} onEdit={vi.fn()} onDelete={vi.fn()}/>);
  fireEvent.click(screen.getByRole("button", { name: "Hoàn thành" }));
  await screen.findByRole("alert"); expect(onUpdate).toHaveBeenCalledWith("done", undefined); expect(onClose).not.toHaveBeenCalled();
 });
 it("không gửi hai lần khi đang lưu một công việc chung", async () => {
  let resolveSave!: () => void; const onSave = vi.fn<(payload: TaskInput) => Promise<void>>(() => new Promise<void>(resolve => { resolveSave = resolve; }));
  render(<TaskForm employees={[]} branches={[{ id: "branch-1", branchCode: "CN01", name: "Chi nhánh 1", status: "hoạt động" }]} templates={[{ id: "template-1", templateCode: "SANG", name: "Ca sáng", startTime: "07:00", endTime: "12:00" }]} branchId="branch-1" isAdmin onClose={vi.fn()} onSave={onSave}/>);
  fireEvent.change(screen.getByLabelText("Tên công việc"), { target: { value: "Kiểm kho" } }); fireEvent.change(screen.getByLabelText("Phạm vi công việc"), { target: { value: "common" } }); fireEvent.change(screen.getByLabelText("Ngày làm"), { target: { value: "2026-11-14" } }); fireEvent.change(screen.getByLabelText("Ca mẫu"), { target: { value: "template-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Giao công việc" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Đang lưu…" })).toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: "Đang lưu…" })); expect(onSave).toHaveBeenCalledTimes(1); expect(onSave.mock.calls[0][0]).toMatchObject({ assignedTo: null, branchId: "branch-1", templateId: "template-1", workDate: "2026-11-14" }); await act(async () => { resolveSave(); });
 });
});


