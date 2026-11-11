"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";

export interface EmployeeOption {
  id: string;
  name: string;
  baseSalary?: number;
  status?: string;
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
  const [employeeId, setEmployeeId] = useState("all");
  const [month, setMonth] = useState(defaultMonth);
  const [baseSalaryStr, setBaseSalaryStr] = useState("8500000");
  const [bonusStr, setBonusStr] = useState("0");

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    if (id !== "all") {
      const emp = employees.find((e) => e.id === id);
      if (emp?.baseSalary) {
        setBaseSalaryStr(String(emp.baseSalary));
      }
    } else {
      setBaseSalaryStr("8500000");
    }
  };

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
                baseSalary: Number(baseSalaryStr) || 0,
                bonus: Number(bonusStr) || 0,
                sumPenalty: true,
              })
            }
            disabled={saving || !employeeId || (isAll && employees.length === 0)}
          >
            {saving
              ? "Đang tạo..."
              : isAll
              ? `Tạo phiếu${employees.length > 0 ? ` (${employees.length} NV)` : ""}`
              : "Tạo phiếu"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nhân viên" required>
          <Select value={employeeId} onChange={(e) => handleEmployeeChange(e.target.value)} disabled={saving}>
            <option value="all">Toàn bộ nhân viên</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Kỳ lương (MM-YYYY)" required>
          <Input value={month} onChange={(e) => setMonth(e.target.value)} disabled={saving} placeholder="10-2026" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Lương cơ bản (VNĐ)"
            required
            hint={isAll ? "Tự động lấy theo từng nhân viên (nếu chưa có sẽ dùng mức này)" : undefined}
          >
            <Input type="number" value={baseSalaryStr} onChange={(e) => setBaseSalaryStr(e.target.value)} disabled={saving} />
          </Field>
          <Field label="Thưởng (VNĐ)">
            <Input type="number" value={bonusStr} onChange={(e) => setBonusStr(e.target.value)} disabled={saving} />
          </Field>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
