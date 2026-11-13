"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";
import type { Department } from "@/types";
import { apiGet } from "@/lib/api";

// Đúng 4 trường organization-service nhận (orgValidator fields.department);
// manager/staff/createdAt do BE tính và trả về, không gửi lên.
export type DepartmentFormPayload = Pick<Department, "name" | "departmentCode" | "managerId" | "status"> & { id?: string };

interface Props {
  open: boolean;
  onClose: () => void;
  department: Department | null;
  onSave: (data: DepartmentFormPayload) => void;
  onDelete?: (department: Department) => void;
  onLock?: (department: Department) => void;
}

export default function DepartmentModal({ open, onClose, department, onSave, onDelete, onLock }: Props) {
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([]);
  const [candidateError, setCandidateError] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const departmentId = department?.id;
  useEffect(() => {
    if (!open || !departmentId) return;
    let ignore = false;
    setLoadingCandidates(true);
    setCandidateError("");
    apiGet<{ id: string; name: string }[]>(`/api/departments/${encodeURIComponent(departmentId)}/manager-candidates`)
      .then(data => { if (!ignore) setCandidates(data || []); })
      .catch(() => { if (!ignore) setCandidateError("Không thể tải danh sách người phụ trách. Vui lòng mở lại form để thử lại."); })
      .finally(() => { if (!ignore) setLoadingCandidates(false); });
    return () => { ignore = true; };
  }, [open, departmentId]);
  const [departmentCode, setDepartmentCode] = useState(department?.departmentCode || "");
  const [name, setName] = useState(department?.name || "");
  const [manager, setManager] = useState(
    department?.managerId || ""
  );
  const [status, setStatus] = useState<"hoạt động" | "tạm dừng">(
    department?.status || "hoạt động"
  );

  const handleSave = () => {
    if (!name.trim() || !departmentCode.trim()) return;
    onSave({
      id: department?.id,
      name: name.trim(),
      departmentCode: departmentCode.trim(),
      managerId: manager || null,
      status,
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
          {department && (onDelete || onLock) && (
            <div className="mr-auto flex items-center gap-2">
              {onLock && (
                <Button
                  type="button"
                  variant="white"
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => onLock(department)}
                >
                  {department.status === "hoạt động" ? "Khóa" : "Mở khóa"}
                </Button>
              )}
              {onDelete && (
                <Button type="button" variant="danger" onClick={() => onDelete(department)}>
                  Xóa
                </Button>
              )}
            </div>
          )}
          <Button variant="white" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave}>{department ? "Lưu thay đổi" : "Tạo phòng ban"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        <Field label="Mã phòng ban" required className="md:col-span-2">
          <Input value={departmentCode} onChange={e => setDepartmentCode(e.target.value)} placeholder="VD: PB-001" />
        </Field>
        <Field label="Tên phòng ban" required className="md:col-span-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên phòng ban..."
          />
        </Field>

        <Field label="Phụ trách" className="md:col-span-2">
            <Select value={manager} onChange={(e) => setManager(e.target.value)} disabled={!department || loadingCandidates || !!candidateError}>
              <option value="">-- Chọn nhân sự phụ trách --</option>
              {candidates.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
              {manager && !candidates.some((emp) => emp.id === manager) && (
                <option value={manager} disabled>{department?.manager || "Người phụ trách hiện tại"}</option>
              )}
            </Select>
            {!department && <p className="mt-1 text-xs text-gray-500">Tạo phòng ban và phân nhân viên vào trước khi chọn người phụ trách.</p>}
            {candidateError && <p role="alert" className="mt-1 text-xs text-red-600">{candidateError}</p>}
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
