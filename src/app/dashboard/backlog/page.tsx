"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { fetchBacklogs, type BacklogItem } from "@/lib/backlog";
import { formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/context/AuthContext";
import { NoAccessNotice } from "@/lib/permissions";
export default function BacklogPage() {
  const { role } = useCurrentUser();
  const [logs, setLogs] = useState<BacklogItem[]>([]);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (role !== "admin") return;
    setLoading(true); setError("");
    try { setLogs(await fetchBacklogs()); }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được nhật ký."); }
    finally { setLoading(false); }
  }, [role]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Load server records when permission changes.
  useEffect(() => { void load(); }, [load]);
  if (role !== "admin") return <NoAccessNotice />;
  const filtered = logs.filter(item => (!module || item.module === module) && [item.userName, item.action, item.module, item.targetName, item.entityId].join(" ").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  return <div className="space-y-4">
    <PageHeader breadcrumb={[{ label: "Hệ thống" }, { label: "Lịch sử thao tác" }]} />
    <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <input aria-label="Tìm nhật ký" placeholder="Người thực hiện, thao tác, đối tượng…" value={search} onChange={e => setSearch(e.target.value)} className="min-w-64 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      <select aria-label="Phân hệ" value={module} onChange={e => setModule(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">Tất cả phân hệ</option>{[...new Set(logs.map(item => item.module))].map(name => <option key={name}>{name}</option>)}</select>
      <Button variant="outline" onClick={load} disabled={loading}>Tải lại</Button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="p-6 text-sm text-gray-500">Đang tải nhật ký…</p> : <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><Table data={filtered} rowKey={row => row.id} columns={[
      { key: "createdAt", header: "Thời gian", render: row => formatDateTime(row.createdAt) },
      { key: "userName", header: "Người thực hiện", render: row => <div>{row.userName}<small className="block text-gray-500">{row.userRole || "—"}</small></div> },
      { key: "action", header: "Thao tác" }, { key: "module", header: "Phân hệ" },
      { key: "targetName", header: "Đối tượng", render: row => <span title={`${row.entityType}: ${row.entityId}`}>{row.targetName}</span> },
    ]} /></div>}
  </div>;
}
