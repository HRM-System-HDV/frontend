"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";

export interface EmployeeOption {
  id: string;
  name: string;
  status?: string;
}

export interface GenerateInput {
  employeeId: string;
  month: string;
  bonus: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  employees: EmployeeOption[];
  defaultMonth: string;
  saving: boolean;
  error: string | null;
  onConfirm: (input: GenerateInput) => void;
}

export default function GeneratePayslipModal({ open, onClose, employees, defaultMonth, saving, error, onConfirm }: Props) {
  const [employeeId, setEmployeeId] = useState("all");
  const [month, setMonth] = useState(defaultMonth);
  const [bonusStr, setBonusStr] = useState("0");

  // Chỉ nhân viên đang làm được cấp phiếu; hồ sơ nghỉ việc/vô hiệu hóa không có trong lựa chọn.
  const activeEmployees = employees.filter((e) => !e.status || e.status === "đang làm");
  const isAll = employeeId === "all";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo phiếu lương tháng"
      size="md"
      footer={
        <>
          <Button variant="white" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button
            onClick={() =>
              onConfirm({
                employeeId,
                month,
                bonus: Number(bonusStr) || 0,
              })
            }
            disabled={saving || !employeeId || !month || (isAll && activeEmployees.length === 0)}
          >
            {saving
              ? "Đang tạo..."
              : isAll
              ? `Tạo phiếu${activeEmployees.length > 0 ? ` (${activeEmployees.length} NV)` : ""}`
              : "Tạo phiếu"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nhân viên">
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={saving}>
            <option value="all">Toàn bộ nhân viên đang làm ({activeEmployees.length})</option>
            {activeEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Kỳ lương" required hint="Định dạng YYYY-MM, khớp quy tắc kỳ lương của server.">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} disabled={saving} />
        </Field>
        <Field label="Thưởng (VNĐ)">
          <Input type="number" min={0} step={1000} value={bonusStr} onChange={(e) => setBonusStr(e.target.value)} disabled={saving} />
        </Field>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
