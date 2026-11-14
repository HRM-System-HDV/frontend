"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";
import type { Department, Position } from "@/types";
import { getTodayVN } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  position: Position | null;
  departments: Department[];
  onSave: (data: Omit<Position, "id"> & { id?: string }) => void;
  onDelete?: (position: Position) => void;
  onLock?: (position: Position) => void;
}

export default function PositionModal({ open, onClose, position, departments, onSave, onDelete, onLock }: Props) {
  const [positionCode, setPositionCode] = useState(position?.positionCode || "");
  const [name, setName] = useState(position?.name || "");
  const [departmentId, setDepartmentId] = useState(position?.departmentId || "");
  const [status, setStatus] = useState<"hoạt động" | "tạm dừng">(position?.status || "hoạt động");

  const staff = position?.staff ?? 0;

  const handleSave = () => {
    if (!name.trim() || !positionCode.trim()) return;
    onSave({
      id: position?.id,
      name: name.trim(),
      positionCode: positionCode.trim(),
      departmentId: departmentId || null,
      status,
      staff,
      createdAt: position?.createdAt || getTodayVN(),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={position ? "Cập nhật vị trí / chức danh" : "Thêm vị trí / chức danh mới"}
      size="lg"
      footer={
        <>
          {position && (onDelete || onLock) && (
            <div className="mr-auto flex items-center gap-2">
              {onLock && (
                <Button
                  type="button"
                  variant="white"
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => onLock(position)}
                >
                  {position.status === "hoạt động" ? "Khóa" : "Mở khóa"}
                </Button>
              )}
              {onDelete && (
                <Button type="button" variant="danger" onClick={() => onDelete(position)}>
                  Xóa
                </Button>
              )}
            </div>
          )}
          <Button variant="white" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave}>{position ? "Lưu thay đổi" : "Tạo vị trí"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        <Field label="Mã vị trí" required className="md:col-span-2">
          <Input value={positionCode} onChange={(e) => setPositionCode(e.target.value)} placeholder="VD: POS-IT" />
        </Field>

        <Field label="Tên vị trí / chức danh" required className="md:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên vị trí..." />
        </Field>

        <Field label="Phòng ban áp dụng" className="md:col-span-2">
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">— Dùng mọi phòng ban (liên chi nhánh) —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.departmentCode})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Trạng thái" required className="md:col-span-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "hoạt động" | "tạm dừng")}>
            <option value="hoạt động">Hoạt động (Đang dùng)</option>
            <option value="tạm dừng">Tạm dừng (Ngưng dùng)</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
