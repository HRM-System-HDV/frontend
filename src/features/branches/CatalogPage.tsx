"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import { Field, Input, Select } from "@/components/ui/Form";
import { useCurrentUser } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { Branch, Department, Position, Employee } from "@/types";

type Kind = "branches" | "departments" | "positions";
type Catalog = Branch | Department | Position;
export type CatalogPayload = { name: string; status: string; address?: string | null; managerId?: string | null; departmentCode?: string; positionCode?: string; departmentId?: string | null };
const titles: Record<Kind, string> = { branches: "Chi nhánh", departments: "Phòng ban", positions: "Vị trí công việc" };
function code(row: Catalog) { return "branchCode" in row ? row.branchCode : "departmentCode" in row ? row.departmentCode : row.positionCode; }

export function CatalogForm({ kind, row, employees, departments, onSave, onClose }: { kind: Kind; row: Catalog | null; employees: Employee[]; departments: Department[]; onSave: (payload: CatalogPayload) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(row?.name ?? "");
  const [businessCode, setCode] = useState(row ? code(row) : "");
  const [address, setAddress] = useState(row && "address" in row ? row.address ?? "" : "");
  const [managerId, setManager] = useState(row && "managerId" in row ? row.managerId ?? "" : "");
  const [departmentId, setDepartment] = useState(row && "departmentId" in row ? row.departmentId ?? "" : "");
  const [status, setStatus] = useState(row?.status ?? "hoạt động");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const managers = employees.filter(e => row && (kind === "branches" ? e.branchId === row.id : e.departmentId === row.id) && e.status !== "nghỉ việc");
  async function save() {
    if (busy) return;
    if (!name.trim() || (kind !== "branches" && !businessCode.trim())) { setError("Vui lòng nhập tên và mã nghiệp vụ."); return; }
    const payload: CatalogPayload = { name: name.trim(), status };
    if (kind === "branches") Object.assign(payload, { address: address.trim() || null, managerId: managerId || null });
    if (kind === "departments") Object.assign(payload, { departmentCode: businessCode.trim(), managerId: managerId || null });
    if (kind === "positions") Object.assign(payload, { positionCode: businessCode.trim(), departmentId: departmentId || null });
    setBusy(true); setError("");
    try { await onSave(payload); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu dữ liệu."); } finally { setBusy(false); }
  }
  return <Modal open onClose={() => !busy && onClose()} title={`${row ? "Cập nhật" : "Thêm"} ${titles[kind].toLowerCase()}`} footer={<><Button variant="white" disabled={busy} onClick={onClose}>Hủy</Button><Button disabled={busy} onClick={save}>{busy ? "Đang lưu..." : "Lưu"}</Button></>}>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    <Field label="Tên" required><Input aria-label="Tên" value={name} onChange={e => setName(e.target.value)} /></Field>
    {kind !== "branches" && <Field label="Mã nghiệp vụ" required><Input aria-label="Mã nghiệp vụ" value={businessCode} onChange={e => setCode(e.target.value)} /></Field>}
    {kind === "branches" && <Field label="Địa chỉ"><Input aria-label="Địa chỉ" value={address} onChange={e => setAddress(e.target.value)} /></Field>}
    {kind !== "positions" && <Field label="Người phụ trách" hint={row ? "Chọn nhân viên thuộc đơn vị này." : "Tạo đơn vị trước rồi gán người phụ trách."}><Select aria-label="Người phụ trách" disabled={!row} value={managerId} onChange={e => setManager(e.target.value)}><option value="">Chưa gán</option>{managers.map(e => <option key={e.id} value={e.id}>{e.employeeCode} — {e.name}</option>)}</Select></Field>}
    {kind === "positions" && <Field label="Phòng ban"><Select aria-label="Phòng ban" value={departmentId} onChange={e => setDepartment(e.target.value)}><option value="">Không thuộc phòng ban</option>{departments.map(d => <option key={d.id} value={d.id}>{d.departmentCode} — {d.name}</option>)}</Select></Field>}
    <Field label="Trạng thái"><Select aria-label="Trạng thái" value={status} onChange={e => setStatus(e.target.value)}><option value="hoạt động">Hoạt động</option><option value="vô hiệu hóa">Vô hiệu hóa</option>{status !== "hoạt động" && status !== "vô hiệu hóa" && <option value={status}>{status}</option>}</Select></Field>
  </Modal>;
}

export default function CatalogPage({ kind }: { kind: Kind }) {
  const { role } = useCurrentUser();
  const [rows, setRows] = useState<Catalog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Catalog | null | undefined>();
  const [deleting, setDeleting] = useState<Catalog | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [items, people, depts] = await Promise.all([apiGet<Catalog[]>(`/api/${kind}`), apiGet<Employee[]>("/api/employees"), apiGet<Department[]>("/api/departments")]); setRows(items); setEmployees(people); setDepartments(depts); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể tải danh mục."); } finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { if (role === "admin" || role === "manager") void load(); }, [load, role]);
  if (role !== "admin" && role !== "manager") return <p>Không có quyền truy cập.</p>;
  async function save(payload: CatalogPayload) {
    const item = editing ? await apiPut<Catalog>(`/api/${kind}/${editing.id}`, payload) : await apiPost<Catalog>(`/api/${kind}`, payload);
    setRows(old => editing ? old.map(r => r.id === item.id ? item : r) : [...old, item]); setNotice("Đã lưu thành công.");
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setError("");
    try { await apiDelete(`/api/${kind}/${deleting.id}`); setDeleting(null); setNotice("Đã xóa thành công."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể xóa."); } finally { setBusy(false); }
  }
  const filtered = rows.filter(r => `${code(r)} ${r.name}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="space-y-4"><PageHeader title={titles[kind]} actions={role === "admin" ? <Button onClick={() => setEditing(null)}>Thêm mới</Button> : undefined} />
    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}<Button variant="link" onClick={load}>Thử lại</Button></div>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    <Input aria-label="Tìm danh mục" placeholder="Tìm theo mã hoặc tên..." value={search} onChange={e => setSearch(e.target.value)} />
    {loading ? <p role="status">Đang tải...</p> : <Table data={filtered} rowKey={r => r.id} columns={[
      { key: "code", header: "Mã", render: code }, { key: "name", header: "Tên" },
      { key: "relation", header: kind === "positions" ? "Phòng ban" : "Người phụ trách", render: r => kind === "positions" ? departments.find(d => d.id === (r as Position).departmentId)?.name ?? "Chưa gán" : employees.find(e => e.id === (r as Branch | Department).managerId)?.name ?? "Chưa gán" },
      ...(kind === "branches" ? [{ key: "address", header: "Địa chỉ" }] : []),
      { key: "status", header: "Trạng thái" }, { key: "actions", header: "Thao tác", render: r => role === "admin" && <div className="flex gap-2"><Button size="sm" onClick={() => setEditing(r)}>Sửa</Button><Button size="sm" variant="danger" onClick={() => setDeleting(r)}>Xóa</Button></div> }
    ]} emptyMessage="Chưa có dữ liệu phù hợp." />}
    {editing !== undefined && role === "admin" && <CatalogForm key={editing?.id ?? "new"} kind={kind} row={editing} employees={employees} departments={departments} onSave={save} onClose={() => setEditing(undefined)} />}
    {deleting && <Modal open onClose={() => !busy && setDeleting(null)} title="Xóa danh mục" footer={<><Button variant="white" disabled={busy} onClick={() => setDeleting(null)}>Hủy</Button><Button variant="danger" disabled={busy} onClick={remove}>{busy ? "Đang xóa..." : "Xác nhận xóa"}</Button></>}><p>Xóa {deleting.name}? Các hồ sơ đang tham chiếu sẽ được bỏ gán đơn vị này.</p></Modal>}
  </div>;
}
