"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Form";
import { useCurrentUser } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import WifiForm, { type WifiPayload } from "@/features/wifi/WifiForm";
import WifiList from "@/features/wifi/WifiList";
import type { WifiConfig, Branch } from "@/types";
export default function WifiPage() {
  const { role } = useCurrentUser();
  const [configs, setConfigs] = useState<WifiConfig[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<WifiConfig | null | undefined>();
  const [deleting, setDeleting] = useState<WifiConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [branchId, setBranch] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [rows, units] = await Promise.all([apiGet<WifiConfig[]>("/api/wifi-configs"), apiGet<Branch[]>("/api/branches")]); setConfigs(rows); setBranches(units); } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải cấu hình Wi-Fi."); } finally { setLoading(false); } }, []);
  // Chỉ khởi tạo dữ liệu quản trị sau khi phiên admin đã sẵn sàng.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (role === "admin") void load(); }, [role, load]);
  if (role !== "admin") return <p>Chỉ admin được quản lý cấu hình Wi-Fi.</p>;
  async function save(payload: WifiPayload) { const row = editing ? await apiPut<WifiConfig>(`/api/wifi-configs/${editing.id}`, payload) : await apiPost<WifiConfig>("/api/wifi-configs", payload); setConfigs(old => editing ? old.map(w => w.id === row.id ? row : w) : [...old, row]); setNotice("Đã lưu cấu hình Wi-Fi."); }
  async function remove() { if (!deleting || busy) return; setBusy(true); setError(""); try { await apiDelete(`/api/wifi-configs/${deleting.id}`); setConfigs(old => old.filter(w => w.id !== deleting.id)); setDeleting(null); setNotice("Đã xóa Wi-Fi."); } catch (e) { setError(e instanceof Error ? e.message : "Không thể xóa."); } finally { setBusy(false); } }
  const filtered = configs.filter(w => (!branchId || w.branchId === branchId) && `${w.ssid} ${w.bssid}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4"><PageHeader title="Wi-Fi chấm công" actions={<Button disabled={loading} onClick={() => setEditing(null)}>Thêm Wi-Fi</Button>} />
    {error && <p role="alert" className="text-red-700">{error}<Button variant="link" onClick={load}>Thử lại</Button></p>}{notice && <p role="status" className="text-green-700">{notice}</p>}
    <div className="flex flex-wrap gap-3"><Input aria-label="Tìm Wi-Fi" className="sm:max-w-sm" placeholder="Tìm SSID hoặc BSSID..." value={search} onChange={e => setSearch(e.target.value)} /><Select aria-label="Lọc chi nhánh" className="sm:max-w-xs" value={branchId} onChange={e => setBranch(e.target.value)}><option value="">Tất cả chi nhánh</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></div>
    {loading ? <p role="status">Đang tải Wi-Fi...</p> : <WifiList configs={filtered} branches={branches} onEdit={setEditing} onDelete={setDeleting} />}
    {editing !== undefined && <WifiForm key={editing?.id ?? "new"} config={editing} branches={branches} onSave={save} onClose={() => setEditing(undefined)} />}
    {deleting && <Modal open title="Xóa Wi-Fi" onClose={() => !busy && setDeleting(null)} footer={<><Button variant="white" disabled={busy} onClick={() => setDeleting(null)}>Hủy</Button><Button variant="danger" disabled={busy} onClick={remove}>{busy ? "Đang xóa..." : "Xác nhận xóa"}</Button></>}><p>Xóa Wi-Fi {deleting.ssid} ({deleting.bssid})?</p>{error && <p role="alert" className="text-red-700">{error}</p>}</Modal>}
  </div>;
}
