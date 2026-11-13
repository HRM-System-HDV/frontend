"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";
import type { Branch, BranchManagerCandidate } from "@/types";

export type BranchFormPayload = Pick<Branch, "name" | "address" | "managerId" | "status"> & { id?: string };

interface Props {
  open: boolean;
  onClose: () => void;
  branch: Branch | null;
  employees?: BranchManagerCandidate[];
  candidatesLoading?: boolean;
  candidatesError?: string;
  readOnly?: boolean;
  saving?: boolean;
  onSave: (data: BranchFormPayload) => void;
  onDelete?: (branch: Branch) => void;
  onLock?: (branch: Branch) => void;
}

export default function BranchModal({ open, onClose, branch, employees = [], candidatesLoading = false, candidatesError = "", readOnly = false, saving = false, onSave, onDelete, onLock }: Props) {
  const [name, setName] = useState(branch?.name || "");
  const [address, setAddress] = useState(branch?.address || "");
  const [manager, setManager] = useState(
    branch?.managerId || ""
  );
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"hoạt động" | "vô hiệu hóa">(
    branch?.status || "hoạt động"
  );

  const handleSave = () => {
    if (readOnly || saving) return;
    if (!name.trim() || !address.trim()) { setError("Vui lòng nhập tên và địa chỉ chi nhánh."); return; }
    setError("");
    onSave({ id: branch?.id, name: name.trim(), address: address.trim(), managerId: branch ? manager || null : null, status });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={branch ? "Cập nhật chi nhánh" : "Thêm chi nhánh"}
      size="lg"
      footer={
        <>
          {branch && !readOnly && (onDelete || onLock) && (
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
          <Button variant="white" disabled={saving} onClick={onClose}>{readOnly ? "Đóng" : "Hủy"}</Button>
          {!readOnly && <Button disabled={saving || candidatesLoading} onClick={handleSave}>{branch ? "Lưu" : "Tạo"}</Button>}
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        {error && <p role="alert" className="md:col-span-2 text-sm text-red-700">{error}</p>}
        <Field label="Tên chi nhánh" required className="md:col-span-2">
          <Input
            value={name}
            disabled={readOnly || saving}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên chi nhánh..."
          />
        </Field>
        <Field label="Địa chỉ" required className="md:col-span-2">
          <Input
            value={address}
            disabled={readOnly || saving}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Nhập địa chỉ chi nhánh..."
          />
        </Field>
        <Field label="Quản lý">
            <Select value={manager} onChange={(e) => setManager(e.target.value)} disabled={!branch || readOnly || saving || candidatesLoading}>
              <option value="">-- Chọn nhân sự quản lý --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
              {manager && !employees.some((emp) => emp.id === manager) && (
                <option value={manager} disabled>{branch?.manager || "Quản lý hiện tại"}</option>
              )}
            </Select>
          {!branch && <p className="mt-1 text-xs text-gray-500">Tạo chi nhánh trước, sau đó gán nhân viên và chọn người quản lý.</p>}
          {candidatesError && <p role="alert" className="mt-1 text-xs text-red-700">{candidatesError}</p>}
        </Field>
        <Field label="Trạng thái" required>
          <Select disabled={readOnly || saving} value={status} onChange={(e) => setStatus(e.target.value as Branch["status"])}>
            <option value="hoạt động">Hoạt động</option>
            <option value="vô hiệu hóa">Vô hiệu hóa</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
