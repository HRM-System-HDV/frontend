"use client";
import { useState } from "react";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Form";
import { formatVND, formatDate } from "@/lib/utils";
import type { Employee, Branch, Department, Position } from "@/types";

export default function EmployeeList({ employees, branches, departments, positions, isManager, onEdit, onLeave }: { employees: Employee[]; branches: Branch[]; departments: Department[]; positions: Position[]; isManager: boolean; onEdit: (employee: Employee) => void; onLeave: (employee: Employee) => void }) {
  const [search, setSearch] = useState("");
  const [branchId, setBranch] = useState("");
  const [departmentId, setDepartment] = useState("");
  const filtered = employees.filter(e => (!branchId || e.branchId === branchId) && (!departmentId || e.departmentId === departmentId) && `${e.employeeCode} ${e.name} ${e.email} ${e.phone ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4"><div className="flex flex-wrap gap-3">
    <Input aria-label="Tìm nhân viên" className="sm:max-w-xs" placeholder="Tìm mã, tên, email, điện thoại..." value={search} onChange={e => setSearch(e.target.value)} />
    {!isManager && <Select aria-label="Lọc chi nhánh" className="sm:max-w-xs" value={branchId} onChange={e => setBranch(e.target.value)}><option value="">Tất cả chi nhánh</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}
    <Select aria-label="Lọc phòng ban" className="sm:max-w-xs" value={departmentId} onChange={e => setDepartment(e.target.value)}><option value="">Tất cả phòng ban</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
  </div><Table data={filtered} rowKey={e => e.id} emptyMessage="Chưa có nhân viên phù hợp." columns={[
    { key: "employeeCode", header: "Mã nhân viên" }, { key: "name", header: "Nhân viên", render: e => <div><p className="font-semibold">{e.name}</p><p className="text-xs text-gray-500">{e.email}</p></div> },
    { key: "branchId", header: "Chi nhánh", render: e => branches.find(b => b.id === e.branchId)?.name ?? "Chưa gán" },
    { key: "departmentId", header: "Phòng ban", render: e => departments.find(d => d.id === e.departmentId)?.name ?? "Chưa gán" },
    { key: "positionId", header: "Vị trí", render: e => positions.find(p => p.id === e.positionId)?.name ?? "Chưa gán" },
    { key: "salary", header: "Lương thỏa thuận", render: e => `${formatVND(e.salary)} / ${e.salaryType === "hourly" ? "giờ" : "tháng"}` },
    { key: "status", header: "Trạng thái", render: e => <div>{e.status}{e.resignedAt && <p className="text-xs text-gray-500">Từ {formatDate(e.resignedAt)}</p>}</div> },
    { key: "actions", header: "Thao tác", render: e => <div className="flex gap-2"><Button size="sm" onClick={() => onEdit(e)}>Hồ sơ</Button>{e.status !== "nghỉ việc" && <Button size="sm" variant="danger" onClick={() => onLeave(e)}>Nghỉ việc</Button>}</div> }
  ]} /></div>;
}
