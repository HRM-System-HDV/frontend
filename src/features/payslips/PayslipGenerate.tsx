"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";

export interface EmployeeOption {
  id: string;
  name: string;
}

export interface GenerateInput {
  employeeId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  sumPenalty: boolean;
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
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [month, setMonth] = useState(defaultMonth);
  const [baseSalaryStr, setBaseSalaryStr] = useState("8500000");
  const [bonusStr, setBonusStr] = useState("0");
  const [sumPenalty, setSumPenalty] = useState(true);

  useEffect(() => {
    if (open) {
      setEmployeeId(employees[0]?.id || "");
      setMonth(defaultMonth);
    }
  }, [open, employees, defaultMonth]);

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
                baseSalary: Number(baseSalaryStr) || 0,
                bonus: Number(bonusStr) || 0,
                sumPenalty,
              })
            }
            disabled={saving || !employeeId}
          >
            {saving ? "Đang tạo..." : "Tạo phiếu"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nhân viên" required>
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={saving}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Kỳ lương (MM-YYYY)" required>
          <Input value={month} onChange={(e) => setMonth(e.target.value)} disabled={saving} placeholder="10-2026" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lương cơ bản (VNĐ)" required>
            <Input type="number" value={baseSalaryStr} onChange={(e) => setBaseSalaryStr(e.target.value)} disabled={saving} />
          </Field>
          <Field label="Thưởng (VNĐ)">
            <Input type="number" value={bonusStr} onChange={(e) => setBonusStr(e.target.value)} disabled={saving} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={sumPenalty}
            onChange={(e) => setSumPenalty(e.target.checked)}
            disabled={saving}
            className="w-4 h-4 accent-primary"
          />
          Tự tổng hợp phạt chấm công theo tháng từ work-service (sumPenalty)
        </label>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500">
          Gọi <span className="font-mono">POST /api/payroll/payslips/generate</span> — chống trùng cặp
          nhân viên + tháng (trùng trả 409). Công thức: thực lĩnh = cơ bản + thưởng − phạt.
        </div>
      </div>
    </Modal>
  );
}
