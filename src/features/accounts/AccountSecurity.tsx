"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

type DeviceSession = {
  id: string;
  deviceName: string;
  deviceType: string | null;
  osInfo: string | null;
  location: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  isCurrent: boolean;
};

const deviceTypes: Record<string, string> = {
  desktop: "Máy tính", phone: "Điện thoại", tablet: "Máy tính bảng",
};

export default function AccountSecurity({ onClose, onPasswordChanged }: {
  onClose: () => void;
  onPasswordChanged: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"password" | "devices">("password");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [reloadDevices, setReloadDevices] = useState(0);
  const [confirmDevice, setConfirmDevice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tab !== "devices") return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingDevices(true); setError("");
      try {
        const result = await apiGet<DeviceSession[]>("/api/auth/devices");
        if (active) setDevices(result);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Không tải được thiết bị đăng nhập.");
      } finally { if (active) setLoadingDevices(false); }
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [tab, reloadDevices]);

  async function finishPasswordChange() {
    try { await onPasswordChanged(); }
    catch (error) {
      setError(`Đã đổi mật khẩu. ${error instanceof Error ? error.message : "Chưa đăng xuất được, vui lòng thử lại."}`);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (busy || passwordChanged) return;
    setError("");
    if (newPassword.length < 6) { setError("Mật khẩu mới phải có tối thiểu 6 ký tự."); return; }
    if (newPassword !== confirmation) { setError("Xác nhận mật khẩu không khớp."); return; }
    setBusy(true);
    try {
      await apiPost("/api/auth/change-password", { currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setPasswordChanged(true);
      await finishPasswordChange();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không đổi được mật khẩu.");
    } finally { setBusy(false); }
  }

  async function revokeDevice(device: DeviceSession) {
    if (busy || device.isCurrent) return;
    setBusy(true); setError("");
    try {
      await apiDelete(`/api/auth/devices/${encodeURIComponent(device.id)}`);
      setDevices(previous => previous.filter(item => item.id !== device.id)); setConfirmDevice(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thu hồi được phiên thiết bị.");
    } finally { setBusy(false); }
  }

  return <Modal open title="Bảo mật tài khoản" size="md" onClose={() => { if (!busy) onClose(); }}>
    <div className="mb-5 flex gap-2" role="tablist" aria-label="Bảo mật tài khoản">
      <Button role="tab" aria-selected={tab === "password"} disabled={busy} variant={tab === "password" ? "primary" : "white"} onClick={() => { setTab("password"); setError(""); }}>Đổi mật khẩu</Button>
      <Button role="tab" aria-selected={tab === "devices"} disabled={busy} variant={tab === "devices" ? "primary" : "white"} onClick={() => { setTab("devices"); setError(""); }}>Thiết bị đăng nhập</Button>
    </div>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {tab === "password" && (passwordChanged ? <div className="space-y-3">
      <p role="status" className="text-sm text-emerald-700">Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.</p>
      <Button disabled={busy} onClick={async () => { if (busy) return; setBusy(true); setError(""); try { await finishPasswordChange(); } finally { setBusy(false); } }}>Đăng xuất để đăng nhập lại</Button>
    </div> : <form onSubmit={changePassword}>
      <p className="mb-4 text-sm text-gray-500">Đổi mật khẩu sẽ thu hồi các phiên đăng nhập. Bạn cần đăng nhập lại sau khi lưu.</p>
      <Field label="Mật khẩu hiện tại" required><Input aria-label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required disabled={busy} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}/></Field>
      <Field label="Mật khẩu mới" required hint="Tối thiểu 6 ký tự."><Input aria-label="Mật khẩu mới" type="password" autoComplete="new-password" minLength={6} required disabled={busy} value={newPassword} onChange={event => setNewPassword(event.target.value)}/></Field>
      <Field label="Xác nhận mật khẩu mới" required><Input aria-label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" minLength={6} required disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)}/></Field>
      <div className="flex justify-end gap-2"><Button type="button" variant="white" disabled={busy} onClick={onClose}>Hủy</Button><Button disabled={busy}>{busy ? "Đang lưu…" : "Lưu mật khẩu"}</Button></div>
    </form>)}
    {tab === "devices" && <div className="space-y-3">
      <div className="flex items-center justify-between gap-2"><p className="text-sm text-gray-500">Các phiên thiết bị của tài khoản hiện tại.</p><Button variant="white" size="sm" disabled={busy || loadingDevices} onClick={() => setReloadDevices(value => value + 1)}>Tải lại</Button></div>
      {loadingDevices ? <p role="status" className="text-sm">Đang tải thiết bị…</p> : devices.length === 0 ? <p className="text-sm text-gray-500">Chưa có dữ liệu thiết bị.</p> : devices.map(device => <div key={device.id} className="rounded-lg border border-gray-200 p-3 text-sm">
        <p className="font-semibold">{device.deviceName || "Thiết bị không xác định"}{device.isCurrent && <span className="ml-2 text-xs text-primary">Thiết bị hiện tại</span>}</p>
        <p className="mt-1 text-gray-500">{deviceTypes[device.deviceType || ""] || "Không rõ loại thiết bị"} · {device.osInfo || "Không rõ hệ điều hành"}</p>
        <p className="mt-1">Địa chỉ IP: {device.ipAddress || "Không rõ"}</p>
        <p>Vị trí: {device.location || "Không rõ"}</p>
        <p className="mt-1 text-xs text-gray-500">Truy cập gần nhất: {device.lastSeenAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(device.lastSeenAt)) : "Không rõ"}</p>
        {device.isCurrent ? <p className="mt-2 text-xs text-gray-500">Dùng nút Đăng xuất trong menu tài khoản để kết thúc phiên hiện tại.</p> : confirmDevice === device.id ? <div className="mt-3 flex flex-wrap items-center gap-2"><span>Thu hồi phiên thiết bị này?</span><Button size="sm" variant="danger" disabled={busy} onClick={() => revokeDevice(device)}>Xác nhận thu hồi</Button><Button size="sm" variant="white" disabled={busy} onClick={() => setConfirmDevice(null)}>Hủy</Button></div> : <Button className="mt-3" size="sm" variant="white" disabled={busy} onClick={() => setConfirmDevice(device.id)}>Thu hồi phiên</Button>}
      </div>)}
    </div>}
  </Modal>;
}
