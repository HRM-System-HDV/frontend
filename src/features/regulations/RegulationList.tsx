"use client";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { getStatusTone, getCategoryColor } from "./helpers";
import { formatDate } from "@/lib/utils";
import type { Regulation, Branch } from "@/types";
export default function RegulationList({ items, branches, onSelect }: { items: Regulation[]; branches: Branch[]; onSelect: (item: Regulation) => void }) {
  return <Table data={[...items].sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.effectiveDate.localeCompare(a.effectiveDate))} rowKey={r => r.id} emptyMessage="Chưa có quy định phù hợp." columns={[
    { key: "regulationCode", header: "Mã quy định" }, { key: "title", header: "Tiêu đề", render: r => <div className="max-w-sm whitespace-normal"><p className="font-semibold">{r.pinned ? "📌 " : ""}{r.title}</p><p className="text-xs text-gray-500">Phiên bản {r.version}</p></div> },
    { key: "category", header: "Danh mục", render: r => <span className={`rounded-md border px-2 py-1 text-xs ${getCategoryColor(r.category)}`}>{r.category}</span> },
    { key: "scopeBranchId", header: "Phạm vi", render: r => r.scopeBranchId ? branches.find(b => b.id === r.scopeBranchId)?.name ?? "Chi nhánh chưa tải được" : "Toàn công ty" },
    { key: "effectiveDate", header: "Hiệu lực từ", render: r => formatDate(r.effectiveDate) }, { key: "status", header: "Trạng thái", render: r => <Badge tone={getStatusTone(r.status)}>{r.status}</Badge> },
    { key: "actions", header: "Thao tác", render: r => <Button size="sm" variant="outline" onClick={() => onSelect(r)}>Chi tiết</Button> }
  ]} />;
}
