"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { TaskItem, TaskPriority, TaskSourceType } from "./types";
import type { Employee } from "@/types";

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  currentBranch: string;
  currentUserName: string;
  onCreated: (task: TaskItem) => void;
}

export default function CreateTaskModal({
  open,
  onClose,
  employees,
  currentBranch,
  currentUserName,
  onCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<TaskSourceType>("manager");
  const [shiftName, setShiftName] = useState("Ca Sáng (07:00 - 14:00)");
  const [assignedToEmail, setAssignedToEmail] = useState(
    employees.length > 0 ? employees[0].email : ""
  );
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const isShift = sourceType === "shift";
    const selectedEmployee = employees.find((emp) => emp.email === assignedToEmail);
    const empName = isShift
      ? `Tất cả nhân sự trực ${shiftName.split("(")[0].trim()}`
      : (selectedEmployee ? selectedEmployee.name : "Nhân viên");
    const empEmail = isShift ? "shift_all" : assignedToEmail;
    const empBranch = isShift ? currentBranch : (selectedEmployee ? selectedEmployee.branch : currentBranch);

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      sourceType,
      assignedByName: sourceType === "manager" ? `${currentUserName} (Giao việc)` : `Quy trình ${shiftName.split("(")[0].trim()}`,
      shiftName: isShift ? shiftName : undefined,
      branch: empBranch,
      dueDate: dueDate.replace("T", " "),
      status: "pending",
      priority,
      assignedToEmail: empEmail,
      assignedToName: empName,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      requirePhoto,
    };

    onCreated(newTask);
    setTitle("");
    setDescription("");
    setRequirePhoto(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Giao việc & Phân công nhiệm vụ mới"
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="white" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Tạo & Giao việc
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Tiêu đề công việc <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ví dụ: Kiểm tra nhiệt độ tủ đông, Đối soát phiếu thu chi..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Phân loại nguồn việc
            </label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as TaskSourceType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="manager">Quản lý giao riêng</option>
              <option value="shift">Cố định theo ca làm việc</option>
            </select>
          </div>

          {sourceType === "shift" ? (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Ca làm việc áp dụng
              </label>
              <select
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="Ca Sáng (07:00 - 14:00)">Ca Sáng (07:00 - 14:00)</option>
                <option value="Ca Chiều (14:00 - 22:00)">Ca Chiều (14:00 - 22:00)</option>
                <option value="Ca Tối (18:00 - 23:00)">Ca Tối (18:00 - 23:00)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="normal">Bình thường</option>
                <option value="high">Quan trọng</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </div>
          )}
        </div>

        {sourceType === "manager" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Người thực hiện (Nhân sự) <span className="text-red-500">*</span>
              </label>
              <select
                value={assignedToEmail}
                onChange={(e) => setAssignedToEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.email}>
                    {emp.name} ({emp.role} - {emp.branch})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Hạn chót hoàn thành (Deadline) <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Hạn chót hoàn thành trong ca <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Yêu cầu chụp ảnh minh chứng */}
        <div className="bg-red-50/70 border border-red-200 rounded-lg p-3 flex items-start gap-3">
          <input
            id="requirePhotoCheck"
            type="checkbox"
            checked={requirePhoto}
            onChange={(e) => setRequirePhoto(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <label htmlFor="requirePhotoCheck" className="text-xs cursor-pointer select-none">
            <span className="font-bold text-gray-900 block">
              Yêu cầu chụp ảnh minh chứng kết quả (Bắt buộc)
            </span>
            <span className="text-gray-600">
              Nhân viên bắt buộc phải chụp ảnh minh chứng thực tế mới có thể bấm nút hoàn thành công việc này.
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Mô tả chi tiết / Hướng dẫn thực hiện
          </label>
          <textarea
            rows={3}
            placeholder="Nội dung chi tiết, các tiêu chuẩn hoặc lưu ý cần kiểm tra..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </form>
    </Modal>
  );
}
