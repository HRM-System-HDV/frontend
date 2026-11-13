"use client";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import type { WifiConfig, Branch } from "@/types";
export default function WifiList({ configs, branches, onEdit, onDelete }: { configs: WifiConfig[]; branches: Branch[]; onEdit: (config: WifiConfig) => void; onDelete: (config: WifiConfig) => void }) {
  return <Table data={configs} rowKey={r => r.id} emptyMessage="Chưa có cấu hình Wi-Fi phù hợp." columns={[{ key: "ssid", header: "Tên Wi-Fi" }, { key: "bssid", header: "BSSID", className: "font-mono" }, { key: "branchId", header: "Chi nhánh", render: r => branches.find(b => b.id === r.branchId)?.name ?? "Chi nhánh chưa tải được" }, { key: "status", header: "Trạng thái", render: r => <StatusBadge status={r.status} /> }, { key: "actions", header: "Thao tác", render: r => <div className="flex gap-2"><Button size="sm" onClick={() => onEdit(r)}>Sửa</Button><Button size="sm" variant="danger" onClick={() => onDelete(r)}>Xóa</Button></div> }]} />;
}
