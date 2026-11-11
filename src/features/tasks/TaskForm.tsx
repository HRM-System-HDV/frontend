"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { TaskItem, TaskPriority, TaskSourceType } from "./types";
import type { Employee, Branch } from "@/types";
import { formatDateTime, toInputDateTime } from "@/lib/utils";

export interface ShiftTemplateOption {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  branches?: Branch[];
  shiftTemplates?: ShiftTemplateOption[];
  isAdmin?: boolean;
  currentBranch: string;
  currentUserName: string;
  onCreated: (task: TaskItem) => void;
}

export default function CreateTaskModal({
  open,
  onClose,
  employees,
  branches = [],
  shiftTemplates = [],
  isAdmin = false,
  currentBranch,
  currentUserName,
  onCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<TaskSourceType>("manager");

  const getTemplateLabel = (tpl: ShiftTemplateOption) => `${tpl.name} (${tpl.startTime} - ${tpl.endTime})`;

  const defaultShiftLabel =
    shiftTemplates.length > 0 ? getTemplateLabel(shiftTemplates[0]) : "Ca Sáng (07:00 - 14:00)";

  const [shiftName, setShiftName] = useState(defaultShiftLabel);
  const [targetBranch, setTargetBranch] = useState(
    currentBranch || (branches.length > 0 ? branches[0].slug.toUpperCase() : "")
  );

  const [assignedToEmail, setAssignedToEmail] = useState(
    employees.length > 0 ? employees[0].email : ""
  );
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return toInputDateTime(d);
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
    
    // Chi nhánh thực hiện: ưu tiên chọn từ dropdown chi nhánh, hoặc theo nhân viên, hoặc chi nhánh hiện tại
    const finalBranch = isShift
      ? (targetBranch || currentBranch || (branches[0]?.slug?.toUpperCase()) || "")
      : (selectedEmployee?.branch || targetBranch || currentBranch || "");

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      sourceType,
      assignedByName: sourceType === "manager" ? `${currentUserName} (Giao việc)` : `Quy trình ${shiftName.split("(")[0].trim()}`,
      shiftName: isShift ? shiftName : undefined,
      branch: finalBranch,
      dueDate: formatDateTime(dueDate),
      status: "pending",
      priority,
      assignedToEmail: empEmail,
      assignedToName: empName,
      createdAt: formatDateTime(new Date()),
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
                Ca làm việc áp dụng <span className="text-xs font-normal text-gray-500">(từ DB)</span>
              </label>
              <select
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                {shiftTemplates.length > 0 ? (
                  shiftTemplates.map((tpl) => {
                    const label = getTemplateLabel(tpl);
                    return (
                      <option key={tpl.id} value={label}>
                        {label}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="Ca Sáng (07:00 - 14:00)">Ca Sáng (07:00 - 14:00)</option>
                    <option value="Ca Chiều (14:00 - 22:00)">Ca Chiều (14:00 - 22:00)</option>
                    <option value="Ca Tối (18:00 - 23:00)">Ca Tối (18:00 - 23:00)</option>
                  </>
                )}
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
                    {emp.name} ({emp.branch ? `${emp.role} - ${emp.branch}` : emp.role})
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isAdmin && (
              /* Vai trò bị ghim: payload vẫn lấy currentBranch từ session, ẩn luôn ô hiển thị. */
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Chi nhánh áp dụng <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                        {b.name} ({b.slug.toUpperCase()})
                      </option>
                    ))
                  ) : (
                    <option value={currentBranch || ""}>{currentBranch || "Chưa có chi nhánh"}</option>
                  )}
                </select>
              </div>
            )}

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
