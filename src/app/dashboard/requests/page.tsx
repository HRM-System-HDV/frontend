"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Form";
import { useCurrentUser } from "@/context/AuthContext";
import { apiGet, apiPut } from "@/lib/api";
import RequestList from "@/features/requests/RequestList";
import RequestDetail from "@/features/requests/RequestDetail";
import { requestLabels, canReviewRequest } from "@/features/requests/helpers";
import type { RequestRecord, Employee, Branch, RequestType, Shift, ShiftTemplate } from "@/types";
export default function RequestsPage() {
  const { role, branchId } = useCurrentUser();
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<RequestRecord | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [branchFilter, setBranch] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [rows, people, units, work, models] = await Promise.all([apiGet<RequestRecord[]>("/api/requests"), apiGet<Employee[]>("/api/employees"), apiGet<Branch[]>("/api/branches"), apiGet<Shift[]>("/api/shifts"), apiGet<ShiftTemplate[]>("/api/shift-templates")]); setRequests(rows); setEmployees(people); setBranches(units); setShifts(work); setTemplates(models); } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải đơn đề nghị."); } finally { setLoading(false); } }, []);
  // Khởi tạo dữ liệu máy chủ khi phiên đăng nhập đã sẵn sàng.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (role === "admin" || role === "manager") void load(); }, [role, load]);
  if (role !== "admin" && role !== "manager") return <p>Không có quyền truy cập.</p>;
  async function review(approved: boolean, reviewNote: string) { if (!selected || !canReviewRequest(selected, role, branchId)) return; const row = await apiPut<RequestRecord>(`/api/requests/${selected.id}/${approved ? "approve" : "reject"}`, { reviewNote }); setRequests(old => old.map(r => r.id === row.id ? row : r)); setSelected(row); setNotice(approved ? "Đã chấp thuận mẫu đơn." : "Đã từ chối mẫu đơn."); }
  const filtered = requests.filter(r => (role === "admin" || !!branchId && r.branchId === branchId) && (!status || r.status === status) && (!type || r.type === type) && (!branchFilter || r.branchId === branchFilter) && `${r.title} ${r.content} ${employees.find(e => e.id === r.employeeId)?.name ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="space-y-4"><PageHeader title="Đơn đề nghị" />
    {error && <p role="alert" className="text-red-700">{error}<Button variant="link" onClick={load}>Thử lại</Button></p>}{notice && <p role="status" className="text-green-700">{notice}</p>}
    <div className="flex flex-wrap gap-3"><Input aria-label="Tìm đơn" className="sm:max-w-xs" placeholder="Tìm nhân viên hoặc nội dung..." value={search} onChange={e => setSearch(e.target.value)} /><Select aria-label="Lọc trạng thái" className="sm:max-w-xs" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="rejected">Từ chối</option></Select><Select aria-label="Lọc loại đơn" className="sm:max-w-xs" value={type} onChange={e => setType(e.target.value)}><option value="">Tất cả loại đơn</option>{(Object.keys(requestLabels) as RequestType[]).map(key => <option key={key} value={key}>{requestLabels[key]}</option>)}</Select>{role === "admin" && <Select aria-label="Lọc chi nhánh" className="sm:max-w-xs" value={branchFilter} onChange={e => setBranch(e.target.value)}><option value="">Tất cả chi nhánh</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}</div>
    {loading ? <p role="status">Đang tải đơn...</p> : <RequestList requests={filtered} employees={employees} branches={branches} onSelect={setSelected} />}
    {selected && <RequestDetail key={selected.id} request={selected} employees={employees} shifts={shifts} templates={templates} canReview={canReviewRequest(selected, role, branchId)} onReview={review} onClose={() => setSelected(null)} />}
  </div>;
}
