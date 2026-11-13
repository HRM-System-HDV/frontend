"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import type { WifiConfig, Branch } from "@/types";
export type WifiPayload = Pick<WifiConfig, "ssid" | "bssid" | "branchId" | "status">;
export default function WifiForm({ config, branches, onSave, onClose }: { config: WifiConfig | null; branches: Branch[]; onSave: (payload: WifiPayload) => Promise<void>; onClose: () => void }) {
  const [ssid, setSSID] = useState(config?.ssid ?? "");
  const [bssid, setBSSID] = useState(config?.bssid ?? "");
  const [branchId, setBranch] = useState(config?.branchId ?? "");
  const [status, setStatus] = useState<WifiConfig["status"]>(config?.status ?? "hoạt động");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (busy) return;
    if (!ssid.trim() || !/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(bssid.trim()) || !branchId) { setError("Nhập SSID, BSSID dạng aa:bb:cc:dd:ee:ff và chọn chi nhánh."); return; }
    setBusy(true); setError(""); try { await onSave({ ssid: ssid.trim(), bssid: bssid.trim().toLowerCase(), branchId, status }); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu Wi-Fi."); } finally { setBusy(false); }
  }
  return <Modal open title={config ? "Cập nhật Wi-Fi" : "Thêm Wi-Fi"} onClose={() => !busy && onClose()} footer={<><Button variant="white" disabled={busy} onClick={onClose}>Hủy</Button><Button disabled={busy} onClick={save}>{busy ? "Đang lưu..." : "Lưu Wi-Fi"}</Button></>}>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    <Field label="Tên Wi-Fi (SSID)" required><Input aria-label="SSID" value={ssid} onChange={e => setSSID(e.target.value)} /></Field>
    <Field label="BSSID" required><Input aria-label="BSSID" placeholder="aa:bb:cc:dd:ee:ff" value={bssid} onChange={e => setBSSID(e.target.value)} /></Field>
    <Field label="Chi nhánh" required><Select aria-label="Chi nhánh" value={branchId} onChange={e => setBranch(e.target.value)}><option value="">Chọn chi nhánh</option>{branches.map(b => <option key={b.id} value={b.id}>{b.branchCode} — {b.name}</option>)}</Select></Field>
    <Field label="Trạng thái"><Select aria-label="Trạng thái" value={status} onChange={e => setStatus(e.target.value as WifiConfig["status"])}><option value="hoạt động">Hoạt động</option><option value="vô hiệu hóa">Vô hiệu hóa</option></Select></Field>
  </Modal>;
}
