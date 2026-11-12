"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { ShiftTemplate } from "@/types";
import { inputClass } from "./types";
export type TemplateInput = { templateCode: string; name: string; startTime: string; endTime: string };
export default function TemplateModal({ template, onClose, onSave }: { template?: ShiftTemplate; onClose: () => void; onSave: (value: TemplateInput) => Promise<void> }) {
 const [form, setForm] = useState<TemplateInput>({ templateCode: template?.templateCode || "", name: template?.name || "", startTime: template?.startTime || "", endTime: template?.endTime || "" });
 const [busy, setBusy] = useState(false), [error, setError] = useState("");
 return <Modal open onClose={() => { if (!busy) onClose(); }} title={template ? "Sửa ca mẫu" : "Thêm ca mẫu"} size="md"><form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); setError(""); try { await onSave(form); onClose(); } catch (error) { setError(error instanceof Error ? error.message : "Không thể lưu ca mẫu"); } finally { setBusy(false); } }}>{([{ key: "templateCode", label: "Mã ca mẫu", type: "text" }, { key: "name", label: "Tên ca mẫu", type: "text" }, { key: "startTime", label: "Giờ bắt đầu", type: "time" }, { key: "endTime", label: "Giờ kết thúc", type: "time" }] as const).map(field => <label key={field.key} className="block text-sm">{field.label}<input aria-label={field.label} className={inputClass} required type={field.type} disabled={field.key === "templateCode" && !!template} value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })}/></label>)}<p className="text-xs text-gray-500">Giờ kết thúc bằng hoặc trước giờ bắt đầu là ca qua đêm. Sửa ca mẫu chỉ áp dụng cho các lần phân ca tiếp theo.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy}>{busy ? "Đang lưu…" : "Lưu ca mẫu"}</Button></form></Modal>;
}
