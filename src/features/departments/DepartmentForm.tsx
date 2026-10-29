"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";
import type { Department, Employee } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  department: Department | null;
  employees: Employee[];
  onSave: (data: Omit<Department, "id"> & { id?: string }) => void;
  onDelete?: (department: Department) => void;
}

export default function DepartmentModal({ open, onClose, department, employees, onSave, onDelete }: Props) {
  const [name, setName] = useState("");
  const [manager, setManager] = useState("");
  const [status, setStatus] = useState<"hoạt động" | "tạm dừng">("hoạt động");

  useEffect(() => {
    if (department) {
      setName(department.name || "");
      setManager(department.manager ? department.manager.split(/—|-|\(/)[0].trim() : "");
      setStatus(department.status || "hoạt động");
    } else {
      setName("");
      setManager("");
      setStatus("hoạt động");
    }
  }, [department, employees, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: department?.id,
      name: name.trim(),
      // Mã phòng ban do BE tự sinh khi tạo; form chỉ giữ lại code ở chế độ sửa.
      code: department?.code ?? "",
      manager: manager.trim(),
      status,
      staff: department?.staff ?? 0,
      createdAt: department?.createdAt || new Date().toLocaleDateString("vi-VN"),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={department ? "Cập nhật thông tin phòng ban" : "Thêm phòng ban mới"}
      size="lg"
      footer={
        <>
          {department && onDelete && (
            <Button
              type="button"
              variant="danger"
              className="mr-auto"
              onClick={() => onDelete(department)}
            >
              Xóa
            </Button>
          )}
          <Button variant="white" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave}>{department ? "Lưu thay đổi" : "Tạo phòng ban"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        <Field label="Tên phòng ban" required className="md:col-span-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên phòng ban..."
          />
        </Field>

        <Field label="Phụ trách" className="md:col-span-2">
          {employees.length > 0 ? (
            <Select value={manager} onChange={(e) => setManager(e.target.value)}>
              <option value="">-- Chọn nhân sự phụ trách --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))}
              {manager && !employees.some((emp) => emp.name === manager) && (
                <option value={manager}>{manager}</option>
              )}
            </Select>
          ) : (
            <Input
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              placeholder="Nhập tên nhân sự phụ trách..."
            />
          )}
        </Field>

        <Field label="Trạng thái hoạt động" required className="md:col-span-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "hoạt động" | "tạm dừng")}>
            <option value="hoạt động">Hoạt động (Đang vận hành)</option>
            <option value="tạm dừng">Tạm dừng (Vô hiệu hóa)</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
