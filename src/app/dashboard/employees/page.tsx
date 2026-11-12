"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Form";
import { useCurrentUser } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import EmployeeForm, { type EmployeePayload } from "@/features/employees/EmployeeForm";
import EmployeeList from "@/features/employees/EmployeeList";
import type { Employee, Branch, Department, Position } from "@/types";

export default function EmployeesPage() {
  const { role, branchId } = useCurrentUser();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const [leaving, setLeaving] = useState<Employee | null>(null);
  const [leaveDate, setLeaveDate] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [people, units, depts, jobs] = await Promise.all([apiGet<Employee[]>("/api/employees"), apiGet<Branch[]>("/api/branches"), apiGet<Department[]>("/api/departments"), apiGet<Position[]>("/api/positions")]);
      setEmployees(people); setBranches(units); setDepartments(depts); setPositions(jobs);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải hồ sơ nhân sự."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (role === "admin" || role === "manager") void load(); }, [role, load]);
  if (role !== "admin" && role !== "manager") return <p>Không có quyền truy cập.</p>;
  const scopedEmployees = role === "manager" ? employees.filter(e => !!branchId && e.branchId === branchId) : employees;
  async function save(payload: EmployeePayload) {
    const row = editing ? await apiPut<Employee>(`/api/employees/${editing.id}`, payload) : await apiPost<Employee>("/api/employees", payload);
    setEmployees(old => editing ? old.map(e => e.id === row.id ? row : e) : [...old, row]); setNotice("Đã lưu hồ sơ nhân viên.");
  }
  async function leave() {
    if (busy || !leaving) return;
    if (!leaveDate || (leaving.joinDate && leaveDate < leaving.joinDate.slice(0, 10))) { setError("Chọn ngày nghỉ việc hợp lệ, từ ngày vào làm trở đi."); return; }
    setBusy(true); setError("");
    try { const row = await apiPost<Employee>(`/api/employees/${leaving.id}/leave`, { resignedAt: leaveDate }); setEmployees(old => old.map(e => e.id === row.id ? row : e)); setLeaving(null); setNotice("Đã ghi nhận nghỉ việc và giữ nguyên lịch sử hồ sơ."); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể ghi nhận nghỉ việc."); } finally { setBusy(false); }
  }
  return <div className="space-y-4"><PageHeader title="Quản lý nhân sự" actions={<Button disabled={loading || (role === "manager" && !branchId)} onClick={() => setEditing(null)}>Thêm nhân viên</Button>} />
    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}<Button variant="link" onClick={load}>Thử lại</Button></div>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {loading ? <p role="status">Đang tải nhân sự...</p> : <EmployeeList employees={scopedEmployees} branches={branches} departments={departments} positions={positions} isManager={role === "manager"} onEdit={setEditing} onLeave={employee => { setLeaving(employee); setLeaveDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())); }} />}
    {editing !== undefined && <EmployeeForm key={editing?.id ?? "new"} employee={editing} branches={branches} departments={departments} positions={positions} managerBranchId={role === "manager" ? branchId : undefined} onSave={save} onClose={() => setEditing(undefined)} />}
    {leaving && <Modal open title="Ghi nhận nghỉ việc" onClose={() => !busy && setLeaving(null)} footer={<><Button variant="white" disabled={busy} onClick={() => setLeaving(null)}>Hủy</Button><Button variant="danger" disabled={busy} onClick={leave}>{busy ? "Đang lưu..." : "Xác nhận nghỉ việc"}</Button></>}><p className="mb-4">Ghi nhận {leaving.name} nghỉ việc. Thông tin CCCD, hồ sơ và lịch sử được giữ lại.</p><Field label="Ngày nghỉ việc" required><Input aria-label="Ngày nghỉ việc" type="date" value={leaveDate} min={leaving.joinDate?.slice(0,10)} onChange={e => setLeaveDate(e.target.value)} /></Field>{error && <p role="alert" className="text-red-700">{error}</p>}</Modal>}
  </div>;
}
