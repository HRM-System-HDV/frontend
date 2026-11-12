"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Form";
import { useCurrentUser } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import NewsForm, { type NewsPayload } from "@/features/news/NewsForm";
import NewsList from "@/features/news/NewsList";
import NewsDetail from "@/features/news/NewsDetail";
import type { News, Branch } from "@/types";

export default function NewsPage() {
  const { role, branchId } = useCurrentUser();
  const [items, setItems] = useState<News[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<News | null | undefined>();
  const [selected, setSelected] = useState<News | null>(null);
  const [deleting, setDeleting] = useState<News | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const canWrite = (item?: News) => role === "admin" || role === "manager" && !!branchId && (!item || item.branchId === branchId);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [news, units] = await Promise.all([apiGet<News[]>("/api/news"), apiGet<Branch[]>("/api/branches")]); setItems(news); setBranches(units); } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải bản tin."); } finally { setLoading(false); } }, []);
  useEffect(() => { if (role === "admin" || role === "manager") void load(); }, [role, load]);
  if (role !== "admin" && role !== "manager") return <p>Không có quyền truy cập.</p>;
  function update(row: News) { setItems(old => old.map(n => n.id === row.id ? row : n)); if (selected?.id === row.id) setSelected(row); }
  async function save(payload: NewsPayload) { const row = editing ? await apiPut<News>(`/api/news/${editing.id}`, payload) : await apiPost<News>("/api/news", payload); if (editing) update(row); else setItems(old => [row, ...old]); setNotice("Đã lưu bản tin."); }
  async function pin() { if (!selected || busy) return; setBusy(true); setError(""); try { update(await apiPut<News>(`/api/news/${selected.id}`, { pinned: !selected.pinned })); setNotice("Đã cập nhật ghim bản tin."); } catch (e) { setError(e instanceof Error ? e.message : "Không thể ghim."); } finally { setBusy(false); } }
  async function remove() { if (!deleting || busy) return; setBusy(true); setError(""); try { await apiDelete(`/api/news/${deleting.id}`); setItems(old => old.filter(n => n.id !== deleting.id)); setDeleting(null); setSelected(null); setNotice("Đã xóa bản tin."); } catch (e) { setError(e instanceof Error ? e.message : "Không thể xóa."); } finally { setBusy(false); } }
  const filtered = items.filter(n => (role === "admin" || !n.branchId || n.branchId === branchId) && (scope === "all" || (scope === "global" ? !n.branchId : n.branchId === scope)) && `${n.title} ${n.summary} ${n.content}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="space-y-4"><PageHeader title="Bảng tin nội bộ" actions={canWrite() ? <Button onClick={() => setEditing(null)}>Đăng bản tin</Button> : undefined} />
    {error && <p role="alert" className="text-red-700">{error}<Button variant="link" onClick={load}>Thử lại</Button></p>}{notice && <p role="status" className="text-green-700">{notice}</p>}
    <div className="flex flex-wrap gap-3"><Input aria-label="Tìm bản tin" className="sm:max-w-sm" placeholder="Tìm nội dung..." value={search} onChange={e => setSearch(e.target.value)} /><Select aria-label="Lọc phạm vi" className="sm:max-w-xs" value={scope} onChange={e => setScope(e.target.value)}><option value="all">Tất cả phạm vi</option><option value="global">Toàn công ty</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></div>
    {loading ? <p role="status">Đang tải bảng tin...</p> : <NewsList items={filtered} branches={branches} onSelect={setSelected} />}
    {editing !== undefined && canWrite(editing ?? undefined) && <NewsForm key={editing?.id ?? "new"} item={editing} branches={branches} managerBranchId={role === "manager" ? branchId : undefined} onSave={save} onClose={() => setEditing(undefined)} />}
    {selected && <NewsDetail item={selected} canWrite={canWrite(selected)} busy={busy} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} onDelete={() => { setDeleting(selected); setSelected(null); }} onPin={pin} />}
    {deleting && <Modal open title="Xóa bản tin" onClose={() => !busy && setDeleting(null)} footer={<><Button variant="white" disabled={busy} onClick={() => setDeleting(null)}>Hủy</Button><Button variant="danger" disabled={busy} onClick={remove}>{busy ? "Đang xóa..." : "Xác nhận xóa"}</Button></>}><p>Xóa bản tin “{deleting.title}”?</p>{error && <p role="alert" className="text-red-700">{error}</p>}</Modal>}
  </div>;
}
