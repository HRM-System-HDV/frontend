"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/Form";
import type { Regulation, Branch, RegulationStatus } from "@/types";
export type RegulationPayload = Pick<Regulation, "regulationCode" | "title" | "category" | "summary" | "content" | "status" | "scopeBranchId" | "effectiveDate" | "expiryDate" | "version" | "pinned">;
export default function RegulationForm({ item, branches, managerBranchId, onSave, onClose }: { item: Regulation | null; branches: Branch[]; managerBranchId?: string | null; onSave: (payload: RegulationPayload) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<RegulationPayload>({ regulationCode: item?.regulationCode ?? "", title: item?.title ?? "", category: item?.category ?? "", summary: item?.summary ?? "", content: item?.content ?? "", status: item?.status ?? "dự thảo", scopeBranchId: managerBranchId ?? item?.scopeBranchId ?? null, effectiveDate: item?.effectiveDate.slice(0,10) ?? "", expiryDate: item?.expiryDate?.slice(0,10) ?? null, version: item?.version ?? "1.0", pinned: item?.pinned ?? false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (busy) return;
    if (![form.regulationCode, form.title, form.category, form.summary, form.content, form.effectiveDate, form.version].every(v => v.trim())) { setError("Vui lòng nhập đầy đủ các trường bắt buộc."); return; }
    if (form.expiryDate && form.expiryDate < form.effectiveDate) { setError("Ngày hết hiệu lực không được trước ngày hiệu lực."); return; }
    setBusy(true); setError("");
    try { await onSave({ ...form, regulationCode: form.regulationCode.trim(), title: form.title.trim(), category: form.category.trim(), summary: form.summary.trim(), content: form.content.trim(), version: form.version.trim() }); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu quy định."); } finally { setBusy(false); }
  }
  return <Modal open title={item ? "Cập nhật quy định" : "Thêm quy định"} size="xl" onClose={() => !busy && onClose()} footer={<><Button variant="white" disabled={busy} onClick={onClose}>Hủy</Button><Button disabled={busy} onClick={save}>{busy ? "Đang lưu..." : "Lưu quy định"}</Button></>}>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    <div className="grid gap-x-4 sm:grid-cols-2">{([["regulationCode", "Mã quy định"], ["title", "Tiêu đề"], ["category", "Danh mục"], ["version", "Phiên bản"]] as const).map(([key, label]) => <Field key={key} label={label} required><Input aria-label={label} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></Field>)}</div>
    <Field label="Tóm tắt" required><Textarea aria-label="Tóm tắt" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></Field>
    <Field label="Nội dung" required><Textarea aria-label="Nội dung" className="min-h-48" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></Field>
    <div className="grid gap-x-4 sm:grid-cols-2"><Field label="Ngày hiệu lực" required><Input aria-label="Ngày hiệu lực" type="date" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} /></Field><Field label="Ngày hết hiệu lực"><Input aria-label="Ngày hết hiệu lực" type="date" min={form.effectiveDate} value={form.expiryDate ?? ""} onChange={e => setForm({ ...form, expiryDate: e.target.value || null })} /></Field>
    <Field label="Trạng thái"><Select aria-label="Trạng thái" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as RegulationStatus })}><option value="dự thảo">Dự thảo</option><option value="hiệu lực">Hiệu lực</option><option value="hết hiệu lực">Hết hiệu lực</option></Select></Field>
    <Field label="Phạm vi"><Select aria-label="Phạm vi" disabled={!!managerBranchId} value={form.scopeBranchId ?? ""} onChange={e => setForm({ ...form, scopeBranchId: e.target.value || null })}>{!managerBranchId && <option value="">Toàn công ty</option>}{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field></div>
    <Checkbox label="Ghim quy định" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} />
    <p className="mt-3 text-xs text-gray-500">Sau khi lưu, mở chi tiết quy định để đính kèm tệp PDF.</p>
  </Modal>;
}
