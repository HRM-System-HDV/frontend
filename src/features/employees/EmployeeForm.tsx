"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import type { Branch, Department, Employee, Position } from "@/types";

export type EmployeePayload = Omit<Employee, "id" | "employeeCode" | "createdAt">;
const textFields = [
  ["name", "Họ tên"], ["email", "Email"], ["phone", "Điện thoại"], ["gender", "Giới tính"],
  ["birthDate", "Ngày sinh"], ["province", "Tỉnh / Thành phố"], ["ward", "Phường / Xã"], ["street", "Địa chỉ"],
  ["cccd", "Số CCCD"], ["issueDate", "Ngày cấp CCCD"], ["issuePlace", "Nơi cấp CCCD"],
  ["cccdFront", "Đường dẫn ảnh CCCD mặt trước"], ["cccdBack", "Đường dẫn ảnh CCCD mặt sau"], ["avatar", "Đường dẫn ảnh đại diện"],
  ["joinDate", "Ngày vào làm"], ["resignedAt", "Ngày nghỉ việc"], ["bankName", "Ngân hàng"],
  ["bankAccountNumber", "Số tài khoản"], ["bankAccountName", "Tên chủ tài khoản"],
] as const;
type TextKey = typeof textFields[number][0];
export default function EmployeeForm({ employee, branches, departments, positions, managerBranchId, onSave, onClose }: { employee: Employee | null; branches: Branch[]; departments: Department[]; positions: Position[]; managerBranchId?: string | null; onSave: (payload: EmployeePayload) => Promise<void>; onClose: () => void }) {
  const [text, setText] = useState<Record<TextKey, string>>(() => Object.fromEntries(textFields.map(([key]) => [key, employee?.[key]?.slice(0, key.endsWith("Date") || key === "resignedAt" ? 10 : undefined) ?? ""])) as Record<TextKey, string>);
  const [branchId, setBranch] = useState(managerBranchId ?? employee?.branchId ?? "");
  const [departmentId, setDepartment] = useState(employee?.departmentId ?? "");
  const [positionId, setPosition] = useState(employee?.positionId ?? "");
  const [status, setStatus] = useState(employee?.status ?? "đang làm");
  const [salaryType, setSalaryType] = useState(employee?.salaryType ?? "");
  const [salary, setSalary] = useState(employee?.salary ?? "");
  const [days, setDays] = useState(employee?.standardWorkDays?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (busy) return;
    if (!text.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.email.trim())) { setError("Vui lòng nhập họ tên và email hợp lệ."); return; }
    if (!salaryType || !/^\d{1,15}$/.test(salary) || (salaryType === "monthly" && (!/^\d+$/.test(days) || Number(days) <= 0))) { setError("Chọn kiểu lương, nhập lương nguyên VNĐ và số công thỏa thuận dương cho lương tháng."); return; }
    if (text.resignedAt && text.joinDate && text.resignedAt < text.joinDate) { setError("Ngày nghỉ việc không được trước ngày vào làm."); return; }
    if (status === "nghỉ việc" && !text.resignedAt) { setError("Vui lòng nhập ngày nghỉ việc."); return; }
    const values = Object.fromEntries(textFields.map(([key]) => [key, text[key].trim() || null]));
    const payload = { ...values, name: text.name.trim(), email: text.email.trim().toLowerCase(), branchId: branchId || null, departmentId: departmentId || null, positionId: positionId || null, status, salaryType, salary, standardWorkDays: salaryType === "monthly" ? Number(days) : null } as EmployeePayload;
    setBusy(true); setError("");
    try { await onSave(payload); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu hồ sơ."); } finally { setBusy(false); }
  }
  return <Modal open onClose={() => !busy && onClose()} title={employee ? `Hồ sơ ${employee.employeeCode}` : "Thêm nhân viên"} size="xl" footer={<><Button variant="white" disabled={busy} onClick={onClose}>Hủy</Button><Button disabled={busy || (!!managerBranchId && !branchId)} onClick={save}>{busy ? "Đang lưu..." : "Lưu hồ sơ"}</Button></>}>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
      {textFields.map(([key, label]) => <Field key={key} label={label} required={key === "name" || key === "email"} hint={key === "email" && employee && managerBranchId ? "Chỉ admin được đổi email đăng nhập." : undefined}><Input aria-label={label} disabled={key === "email" && !!employee && !!managerBranchId} type={key.endsWith("Date") || key === "resignedAt" ? "date" : key === "email" ? "email" : "text"} value={text[key]} onChange={e => setText(old => ({ ...old, [key]: e.target.value }))} /></Field>)}
      <Field label="Chi nhánh"><Select aria-label="Chi nhánh" disabled={!!managerBranchId} value={branchId} onChange={e => setBranch(e.target.value)}><option value="">Chưa gán</option>{branches.map(b => <option key={b.id} value={b.id}>{b.branchCode} — {b.name}</option>)}</Select></Field>
      <Field label="Phòng ban"><Select aria-label="Phòng ban" value={departmentId} onChange={e => { setDepartment(e.target.value); setPosition(""); }}><option value="">Chưa gán</option>{departments.map(d => <option key={d.id} value={d.id}>{d.departmentCode} — {d.name}</option>)}</Select></Field>
      <Field label="Vị trí"><Select aria-label="Vị trí" value={positionId} onChange={e => setPosition(e.target.value)}><option value="">Chưa gán</option>{positions.filter(p => !p.departmentId || p.departmentId === departmentId).map(p => <option key={p.id} value={p.id}>{p.positionCode} — {p.name}</option>)}</Select></Field>
      <Field label="Trạng thái"><Select aria-label="Trạng thái" value={status} onChange={e => setStatus(e.target.value)}><option value="đang làm">Đang làm</option><option value="nghỉ việc">Nghỉ việc</option>{!["đang làm", "nghỉ việc"].includes(status) && <option value={status}>{status}</option>}</Select></Field>
      <Field label="Kiểu lương" required><Select aria-label="Kiểu lương" value={salaryType} onChange={e => setSalaryType(e.target.value as "monthly" | "hourly")}><option value="">Chọn kiểu lương</option><option value="monthly">Lương tháng</option><option value="hourly">Lương giờ</option></Select></Field>
      <Field label="Lương thỏa thuận (VNĐ)" required><Input aria-label="Lương thỏa thuận (VNĐ)" inputMode="numeric" value={salary} onChange={e => setSalary(e.target.value)} /></Field>
      {salaryType === "monthly" && <Field label="Số công thỏa thuận / tháng" required><Input aria-label="Số công thỏa thuận / tháng" type="number" min="1" step="1" value={days} onChange={e => setDays(e.target.value)} /></Field>}
    </div>
  </Modal>;
}
