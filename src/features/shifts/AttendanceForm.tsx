"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Shift, Attendance } from "@/types";
import { attendancePayload, displayDate, inputClass, localTimestamp } from "./types";
export default function AttendanceForm({ shift, attendance, employee, onSave, onClose }: { shift: Shift; attendance?: Attendance; employee: string; onSave: (payload: ReturnType<typeof attendancePayload>) => Promise<void>; onClose: () => void }) {
 const [checkIn, setCheckIn] = useState(localTimestamp(attendance?.checkIn)), [checkOut, setCheckOut] = useState(localTimestamp(attendance?.checkOut)), [note, setNote] = useState(attendance?.penaltyNote || "");
 const [busy, setBusy] = useState(false), [error, setError] = useState("");
 return <Modal open onClose={() => { if (!busy) onClose(); }} title="Cập nhật giờ vào / ra trên ca" size="md"><form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); setError(""); try { await onSave(attendancePayload(checkIn, checkOut, note)); onClose(); } catch (error) { setError(error instanceof Error ? error.message : "Không thể lưu chấm công"); } finally { setBusy(false); } }}><p className="text-sm">{employee} · {displayDate(shift.workDate)} · {shift.scheduledStart}–{shift.scheduledEnd}</p><p className="text-xs text-gray-500">Chọn ngày và giờ theo múi giờ Việt Nam (UTC+7), kể cả ngày ra của ca qua đêm. Đủ giờ vào và ra hợp lệ mới được tính công/lương.</p><label className="block text-sm">Giờ vào<input aria-label="Giờ vào" required type="datetime-local" className={inputClass} value={checkIn} onChange={e => setCheckIn(e.target.value)}/></label><label className="block text-sm">Giờ ra<input aria-label="Giờ ra" required type="datetime-local" className={inputClass} value={checkOut} onChange={e => setCheckOut(e.target.value)}/></label><label className="block text-sm">Ghi chú<textarea className={inputClass} value={note} onChange={e => setNote(e.target.value)}/></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy}>{busy ? "Đang lưu…" : "Lưu giờ vào / ra"}</Button></form></Modal>;
}
