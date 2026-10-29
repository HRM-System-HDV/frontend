"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Employee } from "@/types";

interface Props {
  employee: Employee | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DisableEmployeeDialog({ employee, onConfirm, onCancel }: Props) {
  return (
    <ConfirmDialog
      open={!!employee}
      title="Vô hiệu hóa nhân viên"
      message={`Vô hiệu hóa "${employee?.name}"? Đây là Soft Delete — không xóa vĩnh viễn, lịch sử chấm công & phiếu lương vẫn được giữ.`}
      confirmLabel="Xác nhận vô hiệu hóa"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
