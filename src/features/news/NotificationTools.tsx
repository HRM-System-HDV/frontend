"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Form";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import type { Branch, Employee, Notification, UserRole } from "@/types";

export const reminderFields = [
  ["checkInBefore1Hour", "Nhắc vào ca trước 1 giờ"],
  ["checkInBefore30Min", "Nhắc vào ca trước 30 phút"],
  ["checkInBefore10Min", "Nhắc vào ca trước 10 phút"],
  ["checkOutBefore10Min", "Nhắc ra ca trước 10 phút"],
  ["missedCheckOutAfter10Min", "Nhắc chưa ra ca sau 10 phút"],
  ["missedCheckOutAfter30Min", "Nhắc chưa ra ca sau 30 phút"],
  ["missedCheckOutAfter1Hour", "Nhắc chưa ra ca sau 1 giờ"],
] as const;
export type ReminderSettings = Record<typeof reminderFields[number][0], boolean>;

// Chỉ gửi bảy cờ nhắc được BE xử lý; giữ nguyên cài đặt trình bày của thiết bị.
export function reminderPayload(value: Record<string, unknown>): ReminderSettings {
  return Object.fromEntries(reminderFields.map(([key]) => {
    if (typeof value[key] !== "boolean") throw new Error("Dữ liệu cài đặt nhắc không hợp lệ. Vui lòng tải lại.");
    return [key, value[key]];
  })) as ReminderSettings;
}

export default function NotificationTools({ role, branchId, branches }: { role: UserRole; branchId: string | null; branches: Branch[] }) {
  const [tab, setTab] = useState<"send" | "settings">("send");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [peopleReady, setPeopleReady] = useState(false);
  const [scope, setScope] = useState(role === "manager" ? branchId ?? "" : "");
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendError, setSendError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [sendNotice, setSendNotice] = useState("");
  const [settingsNotice, setSettingsNotice] = useState("");

  async function load() {
    if (loading) return;
    setLoading(true); setSendError(""); setSettingsError("");
    const [people, preferences] = await Promise.allSettled([
      apiGet<Employee[]>("/api/employees"),
      apiGet<Record<string, unknown>>("/api/notifications/settings"),
    ]);
    if (people.status === "fulfilled") { setEmployees(people.value); setPeopleReady(true); }
    else { setPeopleReady(false); setSendError(people.reason instanceof Error ? people.reason.message : "Không tải được danh sách người nhận."); }
    if (preferences.status === "fulfilled") {
      try { setSettings(reminderPayload(preferences.value)); }
      catch (error) { setSettings(null); setSettingsError(error instanceof Error ? error.message : "Không đọc được cài đặt nhắc."); }
    } else { setSettings(null); setSettingsError(preferences.reason instanceof Error ? preferences.reason.message : "Không tải được cài đặt nhắc."); }
    setLoaded(true); setLoading(false);
  }

  const effectiveBranch = role === "manager" ? branchId : scope || null;
  const recipients = employees.filter(employee => employee.status !== "nghỉ việc" && (!effectiveBranch || employee.branchId === effectiveBranch) && (role === "admin" || !!branchId && employee.branchId === branchId));
  async function send() {
    if (sending) return;
    setSendError(""); setSendNotice("");
    if (!title.trim() || !body.trim()) { setSendError("Vui lòng nhập tiêu đề và nội dung thông báo."); return; }
    if (role !== "admin" && (role !== "manager" || !branchId)) { setSendError("Cần được gán chi nhánh để gửi thông báo."); return; }
    if (target && !recipients.some(employee => employee.id === target)) { setSendError("Người nhận không thuộc phạm vi đã chọn."); return; }
    setSending(true);
    try {
      const result = await apiPost<Notification | Notification[]>("/api/notifications", {
        title: title.trim(), body: body.trim(), branchId: effectiveBranch,
        ...(target ? { targetEmployeeId: target } : {}),
      });
      const count = Array.isArray(result) ? result.length : 1;
      setSendNotice(count ? `Đã gửi thông báo đến ${count} người nhận.` : "Không có người nhận trong phạm vi đã chọn.");
      if (count) { setTitle(""); setBody(""); }
    } catch (error) { setSendError(error instanceof Error ? error.message : "Không thể gửi thông báo."); }
    finally { setSending(false); }
  }

  async function saveSettings() {
    if (saving || !settings) return;
    setSaving(true); setSettingsError(""); setSettingsNotice("");
    try {
      const result = await apiPut<Record<string, unknown>>("/api/notifications/settings", reminderPayload(settings));
      setSettings(reminderPayload(result)); setSettingsNotice("Đã lưu cài đặt nhắc của bạn.");
    } catch (error) { setSettingsError(error instanceof Error ? error.message : "Không thể lưu cài đặt nhắc."); }
    finally { setSaving(false); }
  }

  if (role !== "admin" && role !== "manager") return null;
  return <details className="rounded-xl border border-gray-200 bg-white" onToggle={event => { if (event.currentTarget.open && !loaded && !loading) void load(); }}>
    <summary className="cursor-pointer px-4 py-3 font-semibold text-primary">Thông báo và nhắc chấm công</summary>
    <div className="space-y-4 border-t border-gray-100 p-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Công cụ thông báo">
        <Button size="sm" variant={tab === "send" ? "primary" : "white"} aria-pressed={tab === "send"} onClick={() => setTab("send")}>Gửi thông báo</Button>
        <Button size="sm" variant={tab === "settings" ? "primary" : "white"} aria-pressed={tab === "settings"} onClick={() => setTab("settings")}>Nhắc của tôi</Button>
      </div>
      {loading && <p role="status">Đang tải công cụ thông báo...</p>}
      {tab === "send" && <div>
        <p className="mb-4 text-sm text-gray-500">Gửi thông báo đến một nhân viên hoặc mọi nhân viên trong phạm vi đã chọn.</p>
        {sendError && <p role="alert" className="mb-3 text-red-700">{sendError}</p>}{sendNotice && <p role="status" className="mb-3 text-green-700">{sendNotice}</p>}
        {!peopleReady && loaded && <Button variant="link" disabled={loading} onClick={load}>Tải lại người nhận</Button>}
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Phạm vi gửi"><Select aria-label="Phạm vi gửi" value={effectiveBranch ?? ""} disabled={role === "manager" || sending} onChange={event => { setScope(event.target.value); setTarget(""); }}>{role === "admin" && <option value="">Toàn công ty</option>}{branches.filter(branch => role === "admin" || branch.id === branchId).map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field>
          <Field label="Người nhận"><Select aria-label="Người nhận" value={target} disabled={!peopleReady || sending} onChange={event => setTarget(event.target.value)}><option value="">Mọi nhân viên trong phạm vi</option>{recipients.map(employee => <option key={employee.id} value={employee.id}>{employee.employeeCode} — {employee.name}</option>)}</Select></Field>
        </div>
        <Field label="Tiêu đề thông báo" required><Input aria-label="Tiêu đề thông báo" value={title} disabled={sending} onChange={event => setTitle(event.target.value)} /></Field>
        <Field label="Nội dung thông báo" required><Textarea aria-label="Nội dung thông báo" value={body} disabled={sending} onChange={event => setBody(event.target.value)} /></Field>
        <Button disabled={sending || loading || !peopleReady || (role === "manager" && !branchId)} onClick={send}>{sending ? "Đang gửi..." : "Gửi thông báo"}</Button>
      </div>}
      {tab === "settings" && <div>
        <p className="mb-4 text-sm text-gray-500">Cài đặt này áp dụng cho tài khoản của bạn trên các thiết bị. Nhắc chấm công dựa trên ca được phân và giờ vào, ra đã ghi nhận.</p>
        {settingsError && <p role="alert" className="mb-3 text-red-700">{settingsError}</p>}{settingsNotice && <p role="status" className="mb-3 text-green-700">{settingsNotice}</p>}
        {settings ? <><div className="mb-5 grid gap-3 sm:grid-cols-2">{reminderFields.map(([key, label]) => <Checkbox key={key} label={label} checked={settings[key]} disabled={saving || loading} onChange={event => { setSettings({ ...settings, [key]: event.target.checked }); setSettingsNotice(""); }} />)}</div><Button disabled={saving || loading} onClick={saveSettings}>{saving ? "Đang lưu..." : "Lưu cài đặt nhắc"}</Button></> : !loading && <Button variant="white" onClick={load}>Tải lại cài đặt</Button>}
      </div>}
    </div>
  </details>;
}
