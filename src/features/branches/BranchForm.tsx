"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";
import type { Branch, Employee } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  branch: Branch | null;
  employees?: Employee[];
  onSave: (data: Omit<Branch, "id"> & { id?: string }) => void;
  onDelete?: (branch: Branch) => void;
  onLock?: (branch: Branch) => void;
}

export default function BranchModal({ open, onClose, branch, employees = [], onSave, onDelete, onLock }: Props) {
  const [name, setName] = useState(branch?.name || "");
  const [address, setAddress] = useState(branch?.address || "");
  const [manager, setManager] = useState(
    branch?.manager ? branch.manager.split(/—|-|\(/)[0].trim() : ""
  );
  const [status, setStatus] = useState<"hoạt động" | "vô hiệu hóa">(
    branch?.status || "hoạt động"
  );

  const handleSave = () => {
    if (!name) return;
    onSave({ id: branch?.id, name, slug: branch?.slug || "", address, manager, status, staff: branch?.staff ?? 0 });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={branch ? "Cập nhật chi nhánh" : "Thêm chi nhánh"}
      size="lg"
      footer={
        <>
          {branch && (onDelete || onLock) && (
            <div className="mr-auto flex items-center gap-2">
              {/* Trang cha chỉ khóa một chiều (PUT status = "vô hiệu hóa"),
                  nên ẩn nút khi chi nhánh đã khóa; mở khóa qua ô Trạng thái. */}
              {onLock && branch.status === "hoạt động" && (
                <Button
                  type="button"
                  variant="white"
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => onLock(branch)}
                >
                  Khóa
                </Button>
              )}
              {onDelete && (
                <Button type="button" variant="danger" onClick={() => onDelete(branch)}>
                  Xóa
                </Button>
              )}
            </div>
          )}
          <Button variant="white" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave}>{branch ? "Lưu" : "Tạo"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        <Field label="Tên chi nhánh" required className="md:col-span-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên chi nhánh..."
          />
        </Field>
        <Field label="Địa chỉ" required className="md:col-span-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Nhập địa chỉ chi nhánh..."
          />
        </Field>
        <Field label="Quản lý">
          {employees.length > 0 ? (
            <Select value={manager} onChange={(e) => setManager(e.target.value)}>
              <option value="">-- Chọn nhân sự quản lý --</option>
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
              placeholder="Nhập tên người quản lý..."
            />
          )}
        </Field>
        <Field label="Trạng thái" required>
          <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="hoạt động">Hoạt động</option>
            <option value="vô hiệu hóa">Vô hiệu hóa</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
