"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Checkbox } from "@/components/ui/Form";
import { apiGet } from "@/lib/api";
import type { ShiftTemplate } from "@/features/shifts/types";
import type { Employee, Branch } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  templates: ShiftTemplate[];
  employee: string;
  branch: string;
  date: string;
  templateId: string;
  note: string;
  isRecurring: boolean;
  isManager?: boolean;
  managerBranch?: string;
  employees?: Employee[];
  onEmployeeChange: (v: string) => void;
  onBranchChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onRecurringChange: (v: boolean) => void;
  onSave: () => void;
}

export default function AssignShiftModal({
  open,
  onClose,
  templates,
  employee,
  branch,
  date,
  templateId,
  note,
  isRecurring,
  isManager = false,
  managerBranch,
  employees: employeesProp,
  onEmployeeChange,
  onBranchChange,
  onNoteChange,
  onRecurringChange,
  onSave,
}: Props) {
  const empList = employeesProp ?? [];
  const [branches, setBranches] = useState<Branch[]>([]);
  // Khung ca khóa cứng theo ca được bấm trong lịch (không cho đổi trong modal).
  const activeTemplate = templates.find((t) => t.id === templateId);

  useEffect(() => {
    if (!open) return;
    apiGet<Branch[]>("/api/branches").then((d) => setBranches(d || [])).catch(() => {});
  }, [open ]);
  // Chi nhánh: rỗng = admin xem "Tất cả chi nhánh" -> mở select để tự chọn lúc phân công;
  // có giá trị (hoặc manager) -> khóa cứng theo chi nhánh đang lọc.
  const isBranchLocked = isManager || (!!branch && branch !== "all");
  const branchDisplay = isManager ? (managerBranch ?? branch) : branch;
  return (
    <Modal open={open} onClose={onClose} title="Phân công nhân viên vào ca" size="lg" footer={<><Button variant="white" onClick={onClose}>Hủy</Button><Button onClick={onSave}>Phân công</Button></>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        <Field label="Nhân viên" required>
          <Select value={employee} onChange={(e) => onEmployeeChange(e.target.value)}>
            {empList.filter((e) => e.status === "đang làm").map((emp) => (
              <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
            ))}
          </Select>
        </Field>
        <Field label="Chi nhánh" required>
          {isBranchLocked ? (
            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 flex items-center justify-between">
              <span>Chi nhánh {branchDisplay}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary-50 text-primary border border-primary-200">{isManager ? "Cố định" : "Đã chọn"}</span>
            </div>
          ) : (
            <Select value={branch} onChange={(e) => onBranchChange(e.target.value)}>
              <option value="" disabled>
                — Chọn chi nhánh —
              </option>
              {branches.map((b) => (
                <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                  Chi nhánh {b.slug.toUpperCase()} ({b.name})
                </option>
              ))}
            </Select>
          )}
          {isManager && <p className="text-[11px] text-gray-400 mt-1">Manager chỉ phân ca cho chi nhánh phụ trách</p>}
          {!isManager && isBranchLocked && <p className="text-[11px] text-gray-400 mt-1">Đã khóa theo chi nhánh đã chọn ở bộ lọc tổng</p>}
        </Field>
        <Field label="Ngày làm việc" required>
          <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800">
            {date}
          </div>
        </Field>
        <Field label="Khung ca áp dụng" required>
          <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800">
            {activeTemplate ? `${activeTemplate.name} (${activeTemplate.startTime} - ${activeTemplate.endTime})` : "—"}
          </div>
        </Field>
      </div>
      <Field label="Ghi chú phân công (tùy chọn)">
        <Input placeholder="VD: Phụ trách ca chính, hỗ trợ chi nhánh..." value={note} onChange={(e) => onNoteChange(e.target.value)} />
      </Field>
      <div className="mt-1">
        <Checkbox
          label="Lặp lại mỗi tuần"
          checked={isRecurring}
          onChange={(e) => onRecurringChange(e.target.checked)}
        />
      </div>
    </Modal>
  );
}
