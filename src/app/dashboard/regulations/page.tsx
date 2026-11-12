"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Form";
import { useCurrentUser } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import RegulationForm, { type RegulationPayload } from "@/features/regulations/RegulationForm";
import RegulationList from "@/features/regulations/RegulationList";
import RegulationDetail from "@/features/regulations/RegulationDetail";
import type { Regulation, Branch } from "@/types";

export default function RegulationsPage() {
  const { role, branchId } = useCurrentUser();
  const [items, setItems] = useState<Regulation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Regulation | null | undefined>();
  const [selected, setSelected] = useState<Regulation | null>(null);
  const [deleting, setDeleting] = useState<Regulation | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [status, setStatus] = useState("");
  const canWrite = (item?: Regulation) => role === "admin" || role === "manager" && !!branchId && (!item || item.scopeBranchId === branchId);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [rules, units] = await Promise.all([apiGet<Regulation[]>("/api/regulations"), apiGet<Branch[]>("/api/branches")]); setItems(rules); setBranches(units); } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải quy định."); } finally { setLoading(false); } }, []);
  useEffect(() => { if (role === "admin" || role === "manager") void load(); }, [role, load]);
  if (role !== "admin" && role !== "manager") return <p>Không có quyền truy cập.</p>;
  function update(row: Regulation) { setItems(old => old.map(n => n.id === row.id ? row : n)); if (selected?.id === row.id) setSelected(row); }
  async function save(payload: RegulationPayload) { const row = editing ? await apiPut<Regulation>(`/api/regulations/${editing.id}`, payload) : await apiPost<Regulation>("/api/regulations", payload); if (editing) update(row); else setItems(old => [row, ...old]); setNotice("Đã lưu quy định."); }
  async function detail(item: Regulation) { if (busy) return; setBusy(true); setError(""); try { setSelected(await apiGet<Regulation>(`/api/regulations/${item.id}`)); } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải chi tiết."); } finally { setBusy(false); } }
  async function pin() { if (!selected || busy) return; setBusy(true); setError(""); try { const row = await apiPut<Regulation>(`/api/regulations/${selected.id}`, { pinned: !selected.pinned }); update({ ...row, files: selected.files }); setNotice("Đã cập nhật ghim quy định."); } catch (e) { setError(e instanceof Error ? e.message : "Không thể ghim."); } finally { setBusy(false); } }
  async function remove() { if (!deleting || busy) return; setBusy(true); setError(""); try { await apiDelete(`/api/regulations/${deleting.id}`); setItems(old => old.filter(n => n.id !== deleting.id)); setDeleting(null); setNotice("Đã xóa quy định."); } catch (e) { setError(e instanceof Error ? e.message : "Không thể xóa."); } finally { setBusy(false); } }
  const filtered = items.filter(n => (role === "admin" || !n.scopeBranchId || n.scopeBranchId === branchId) && (scope === "all" || (scope === "global" ? !n.scopeBranchId : n.scopeBranchId === scope)) && (!status || n.status === status) && `${n.regulationCode} ${n.title} ${n.summary}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="space-y-4"><PageHeader title="Quy định nội bộ" actions={canWrite() ? <Button onClick={() => setEditing(null)}>Thêm quy định</Button> : undefined} />
    {error && <p role="alert" className="text-red-700">{error}<Button variant="link" onClick={load}>Thử lại</Button></p>}{notice && <p role="status" className="text-green-700">{notice}</p>}
    <div className="flex flex-wrap gap-3"><Input aria-label="Tìm quy định" className="sm:max-w-sm" placeholder="Tìm mã, tiêu đề..." value={search} onChange={e => setSearch(e.target.value)} /><Select aria-label="Lọc phạm vi" className="sm:max-w-xs" value={scope} onChange={e => setScope(e.target.value)}><option value="all">Tất cả phạm vi</option><option value="global">Toàn công ty</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select><Select aria-label="Lọc trạng thái" className="sm:max-w-xs" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="dự thảo">Dự thảo</option><option value="hiệu lực">Hiệu lực</option><option value="hết hiệu lực">Hết hiệu lực</option></Select></div>
    {loading ? <p role="status">Đang tải quy định...</p> : <RegulationList items={filtered} branches={branches} onSelect={detail} />}
    {editing !== undefined && canWrite(editing ?? undefined) && <RegulationForm key={editing?.id ?? "new"} item={editing} branches={branches} managerBranchId={role === "manager" ? branchId : undefined} onSave={save} onClose={() => setEditing(undefined)} />}
    {selected && <RegulationDetail item={selected} canWrite={canWrite(selected)} busy={busy} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} onDelete={() => { setDeleting(selected); setSelected(null); }} onPin={pin} onUploaded={update} />}
    {deleting && <Modal open title="Xóa quy định" onClose={() => !busy && setDeleting(null)} footer={<><Button variant="white" disabled={busy} onClick={() => setDeleting(null)}>Hủy</Button><Button variant="danger" disabled={busy} onClick={remove}>{busy ? "Đang xóa..." : "Xác nhận xóa"}</Button></>}><p>Xóa quy định “{deleting.title}”?</p>{error && <p role="alert" className="text-red-700">{error}</p>}</Modal>}
  </div>;
}
