"use client";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { requestLabels, requestStatus } from "./helpers";
import type { RequestRecord, Employee, Branch } from "@/types";
export default function RequestList({ requests, employees, branches, onSelect }: { requests: RequestRecord[]; employees: Employee[]; branches: Branch[]; onSelect: (row: RequestRecord) => void }) {
  return <Table data={[...requests].sort((a,b) => b.createdAt.localeCompare(a.createdAt))} rowKey={r => r.id} emptyMessage="Chưa có đơn phù hợp." columns={[
    { key: "employeeId", header: "Nhân viên", render: r => { const e = employees.find(e => e.id === r.employeeId); return e ? `${e.employeeCode} — ${e.name}` : "Hồ sơ chưa tải được"; } },
    { key: "type", header: "Loại đơn", render: r => requestLabels[r.type] }, { key: "title", header: "Tiêu đề", className: "max-w-sm whitespace-normal" },
    { key: "branchId", header: "Chi nhánh", render: r => branches.find(b => b.id === r.branchId)?.name ?? "Chưa gán" },
    { key: "status", header: "Trạng thái", render: r => requestStatus[r.status] }, { key: "createdAt", header: "Ngày gửi", render: r => formatDate(r.createdAt) },
    { key: "actions", header: "Thao tác", render: r => <Button size="sm" variant="outline" onClick={() => onSelect(r)}>Chi tiết</Button> }
  ]} />;
}
