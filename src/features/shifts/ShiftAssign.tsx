"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Employee, Shift, ShiftTemplate } from "@/types";
import { dayValue, employeeLabel, templateLabel, inputClass } from "./types";
export type ShiftInput = { employeeId: string; templateId: string; workDate: string; note: string; status?: Shift["status"] };
export default function AssignShiftModal({ shift, employees, templates, date, onClose, onSave }: { shift?: Shift; employees: Employee[]; templates: ShiftTemplate[]; date: string; onClose: () => void; onSave: (payload: ShiftInput) => Promise<void> }) {
  const [form, setForm] = useState<ShiftInput>({ employeeId: shift?.employeeId || "", templateId: shift?.templateId || "", workDate: dayValue(shift?.workDate) || date, note: shift?.note || "", ...(shift?.id ? { status: shift.status } : {}) });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [checkedKey, setCheckedKey] = useState(""), [availabilityRetry, setAvailabilityRetry] = useState(0);
  const availabilityKey = `${form.employeeId}|${form.workDate}`;
  const availabilityReady = checkedKey === availabilityKey;
  const [existing, setExisting] = useState<Shift[]>([]), [availabilityLoading, setAvailabilityLoading] = useState(false), [availabilityError, setAvailabilityError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!form.employeeId || !form.workDate) return;
      setAvailabilityLoading(true); setAvailabilityError("");
      try {
        const rows = await apiGet<Shift[]>(`/api/shifts?employeeId=${encodeURIComponent(form.employeeId)}&workDate=${encodeURIComponent(form.workDate)}`);
        if (active) { setExisting(rows.filter(row => row.id !== shift?.id)); setCheckedKey(`${form.employeeId}|${form.workDate}`); }
      } catch (error) { if (active) setAvailabilityError(error instanceof Error ? error.message : "Không thể kiểm tra lịch nhân viên"); }
      finally { if (active) setAvailabilityLoading(false); }
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [form.employeeId, form.workDate, shift?.id, availabilityRetry]);
  const duplicate = existing.some(row => row.templateId === form.templateId);
  async function submit(event: React.FormEvent) { event.preventDefault(); if (busy || availabilityLoading || !availabilityReady) return; if (duplicate) { setError("Nhân viên đã có ca này trong ngày"); return; } if (availabilityError) { setError(availabilityError); return; } setBusy(true); setError(""); try { await onSave(form); onClose(); } catch (error) { setError(error instanceof Error ? error.message : "Không thể lưu ca"); } finally { setBusy(false); } }
  return <Modal open onClose={() => { if (!busy) onClose(); }} title={shift?.id ? "Sửa ca làm việc" : "Phân ca làm việc"} size="md"><form onSubmit={submit} className="space-y-4"><label className="block text-sm">Nhân viên<select aria-label="Nhân viên" required className={inputClass} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}><option value="">Chọn nhân viên</option>{employees.map(e => <option key={e.id} value={e.id}>{employeeLabel(e)}</option>)}</select></label><label className="block text-sm">Ca mẫu<select aria-label="Ca mẫu" required className={inputClass} value={form.templateId} onChange={e => setForm({ ...form, templateId: e.target.value })}><option value="">Chọn ca mẫu</option>{templates.map(t => <option key={t.id} value={t.id} disabled={existing.some(row => row.templateId === t.id)}>{templateLabel(t)} ({t.startTime}–{t.endTime}){existing.some(row => row.templateId === t.id) ? " · Đã được phân" : ""}</option>)}</select></label><label className="block text-sm">Ngày làm<input aria-label="Ngày làm" required type="date" className={inputClass} value={form.workDate} onChange={e => setForm({ ...form, workDate: e.target.value })}/></label>{shift?.id && <label className="block text-sm">Trạng thái ca<select aria-label="Trạng thái ca" className={inputClass} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Shift["status"] })}><option value="đang làm">Đang làm</option><option value="đã hủy">Đã hủy</option></select></label>}<label className="block text-sm">Ghi chú<textarea className={inputClass} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}/></label>{availabilityLoading && <p role="status" className="text-sm text-gray-500">Đang kiểm tra lịch nhân viên…</p>}{availabilityError && <div role="alert" className="text-sm text-red-700">{availabilityError}<Button type="button" variant="white" size="sm" onClick={() => setAvailabilityRetry(value => value + 1)}>Thử kiểm tra lại</Button></div>}{duplicate && <p className="text-sm text-red-700">Nhân viên đã có ca này trong ngày. Vui lòng chọn ca khác.</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="white" disabled={busy} onClick={onClose}>Hủy</Button><Button disabled={busy || availabilityLoading || !availabilityReady || duplicate || !!availabilityError}>{busy ? "Đang lưu…" : "Lưu phân ca"}</Button></div></form></Modal>;
}



