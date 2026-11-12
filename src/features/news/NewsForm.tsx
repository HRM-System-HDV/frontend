"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/Form";
import type { News, Branch } from "@/types";

export type NewsPayload = Pick<News, "title" | "summary" | "content" | "publishDate" | "tag" | "pinned" | "branchId">;
export default function NewsForm({ item, branches, managerBranchId, onSave, onClose }: { item: News | null; branches: Branch[]; managerBranchId?: string | null; onSave: (payload: NewsPayload) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<NewsPayload>({ title: item?.title ?? "", summary: item?.summary ?? "", content: item?.content ?? "", publishDate: item?.publishDate.slice(0,10) ?? "", tag: item?.tag ?? "Thông báo", pinned: item?.pinned ?? false, branchId: managerBranchId ?? item?.branchId ?? null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (busy) return;
    if (![form.title, form.summary, form.content, form.tag, form.publishDate].every(v => v.trim())) { setError("Vui lòng nhập đủ tiêu đề, tóm tắt, nội dung, ngày đăng và nhãn."); return; }
    setBusy(true); setError("");
    try { await onSave({ ...form, title: form.title.trim(), summary: form.summary.trim(), content: form.content.trim(), tag: form.tag.trim() }); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu bản tin."); } finally { setBusy(false); }
  }
  return <Modal open title={item ? "Cập nhật bản tin" : "Đăng bản tin"} size="xl" onClose={() => !busy && onClose()} footer={<><Button variant="white" disabled={busy} onClick={onClose}>Hủy</Button><Button disabled={busy} onClick={save}>{busy ? "Đang lưu..." : "Lưu bản tin"}</Button></>}>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    <Field label="Tiêu đề" required><Input aria-label="Tiêu đề" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
    <Field label="Tóm tắt" required><Textarea aria-label="Tóm tắt" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></Field>
    <Field label="Nội dung" required><Textarea aria-label="Nội dung" className="min-h-52" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></Field>
    <div className="grid gap-x-4 sm:grid-cols-2"><Field label="Ngày đăng" required><Input aria-label="Ngày đăng" type="date" value={form.publishDate} onChange={e => setForm({ ...form, publishDate: e.target.value })} /></Field><Field label="Nhãn" required><Input aria-label="Nhãn" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} /></Field></div>
    <Field label="Phạm vi"><Select aria-label="Phạm vi" disabled={!!managerBranchId} value={form.branchId ?? ""} onChange={e => setForm({ ...form, branchId: e.target.value || null })}>{!managerBranchId && <option value="">Toàn công ty</option>}{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
    <Checkbox label="Ghim bản tin" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} />
  </Modal>;
}
