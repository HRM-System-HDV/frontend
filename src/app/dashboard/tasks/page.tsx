"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { useCurrentUser } from "@/context/AuthContext";
import type { Task, Employee, Branch, ShiftTemplate } from "@/types";
import TaskForm from "@/features/tasks/TaskForm";
import TaskDetail from "@/features/tasks/TaskDetail";
import TaskTable from "@/features/tasks/TaskTable";
import { statusLabels } from "@/features/tasks/types";
import { employeeLabel, templateLabel, displayDate, inputClass } from "@/features/shifts/types";
export default function TasksPage() {
 const { role, branchId } = useCurrentUser(); const allowed = role === "admin" || role === "manager";
 const [tasks, setTasks] = useState<Task[]>([]), [employees, setEmployees] = useState<Employee[]>([]), [branches, setBranches] = useState<Branch[]>([]), [templates, setTemplates] = useState<ShiftTemplate[]>([]);
 const [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState(""), [query, setQuery] = useState(""), [status, setStatus] = useState(""), [kind, setKind] = useState(""), [branchFilter, setBranchFilter] = useState("");
 const [edit, setEdit] = useState<Task | "new" | null>(null), [detail, setDetail] = useState<Task | null>(null);
 const requestId = useRef(0);
 const load = useCallback(async () => {
  if (!allowed) { setLoading(false); return; } const request = ++requestId.current; setLoading(true); setError("");
  const results = await Promise.allSettled([apiGet<Task[]>("/api/tasks"), apiGet<Employee[]>("/api/employees"), role === "admin" ? apiGet<Branch[]>("/api/branches") : Promise.resolve([] as Branch[]), apiGet<ShiftTemplate[]>("/api/shift-templates")]);
  if (request !== requestId.current) return;
  const [task, emp, branch, template] = results; if (task.status === "fulfilled") setTasks(task.value); if (emp.status === "fulfilled") setEmployees(emp.value); if (branch.status === "fulfilled") setBranches(branch.value); if (template.status === "fulfilled") setTemplates(template.value);
  const failures = results.filter(r => r.status === "rejected"); if (failures.length) setError(failures.map(r => r.reason instanceof Error ? r.reason.message : "Không thể tải công việc").join(" · ")); setLoading(false);
 }, [allowed, role]);
 useEffect(() => {
  const timer = setTimeout(() => { void load(); }, 0);
  const invalidate = () => { requestId.current++; };
  return () => { clearTimeout(timer); invalidate(); };
 }, [load]);
 async function change(operation: () => Promise<unknown>, message: string) { await operation(); setNotice(message); await load(); }
 function assignee(task: Task): string {
  if (task.assignedTo) { const employee = employees.find(e => e.id === task.assignedTo); return employee ? employeeLabel(employee) : task.assignedToName || "Nhân viên ngoài danh mục hiện tại"; }
  const branch = branches.find(b => b.id === task.branchId), template = templates.find(t => t.id === task.templateId);
  return `${branch ? `${branch.branchCode} · ${branch.name}` : "Chi nhánh được giao"} / ${displayDate(task.workDate)} / ${template ? templateLabel(template) : task.shiftName || "Ca mẫu ngoài danh mục hiện tại"}`;
 }
 const shown = tasks.filter(task => (!status || task.status === status) && (!kind || (kind === "common" ? task.assignedTo === null : task.assignedTo !== null)) && (!branchFilter || task.branchId === branchFilter) && (!query.trim() || `${task.title} ${task.description || ""} ${assignee(task)}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))));
 if (!allowed) return <p className="p-6 text-sm">Bạn không có quyền truy cập trang này.</p>;
 return <div className="space-y-5"><PageHeader breadcrumb={[{ label: "HRM", href: "/dashboard" }, { label: "Công việc" }]} actions={<Button disabled={loading || !!error} onClick={() => setEdit("new")}>Giao công việc</Button>}/>{notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><Button variant="white" onClick={load}>Thử lại</Button></div>}<div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm">Tìm kiếm<input aria-label="Tìm công việc" className={inputClass} value={query} placeholder="Tên việc, nhân viên, ca…" onChange={e => setQuery(e.target.value)}/></label><label className="text-sm">Trạng thái<select aria-label="Lọc trạng thái" className={inputClass} value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm">Phạm vi<select aria-label="Lọc phạm vi" className={inputClass} value={kind} onChange={e => setKind(e.target.value)}><option value="">Tất cả công việc</option><option value="personal">Cá nhân</option><option value="common">Chung theo ca</option></select></label>{role === "admin" && <label className="text-sm">Chi nhánh<select aria-label="Lọc chi nhánh" className={inputClass} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}><option value="">Tất cả chi nhánh</option>{branches.map(b => <option key={b.id} value={b.id}>{b.branchCode} · {b.name}</option>)}</select></label>}</div>{loading ? <p role="status" className="rounded-xl border border-gray-200 bg-white p-6 text-sm">Đang tải công việc…</p> : <TaskTable tasks={shown} assignee={assignee} onOpen={setDetail}/>}
 {edit && <TaskForm key={edit === "new" ? "new" : edit.id} task={edit === "new" ? undefined : edit} employees={employees} branches={branches} templates={templates} branchId={branchId} isAdmin={role === "admin"} onClose={() => setEdit(null)} onSave={payload => change(() => edit === "new" ? apiPost("/api/tasks", { ...payload, status: "pending" }) : apiPut(`/api/tasks/${edit.id}`, payload), "Đã lưu công việc")}/>}
 {detail && <TaskDetail key={detail.id} task={detail} assignee={assignee(detail)} onClose={() => setDetail(null)} onEdit={() => { setEdit(detail); setDetail(null); }} onUpdate={(status, proofPhotoUrl) => change(() => apiPut(`/api/tasks/${detail.id}`, { status, ...(proofPhotoUrl ? { proofPhotoUrl } : {}) }), "Đã cập nhật kết quả công việc")} onDelete={() => change(() => apiDelete(`/api/tasks/${detail.id}`), "Đã xóa công việc")}/>}
 </div>;
}

