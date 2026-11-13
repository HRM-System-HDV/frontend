"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Form";
import { formatDate, formatVND } from "@/lib/utils";
import { requestLabels, requestStatus } from "./helpers";
import type { RequestRecord, Employee, Shift, ShiftTemplate } from "@/types";
export default function RequestDetail({ request, employees, shifts, templates, canReview, onReview, onClose }: { request: RequestRecord; employees: Employee[]; shifts: Shift[]; templates: ShiftTemplate[]; canReview: boolean; onReview: (approved: boolean, note: string) => Promise<void>; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function employee(id?: string | null) { const e = employees.find(e => e.id === id); return e ? `${e.employeeCode} — ${e.name}` : id ?? "Chưa gán"; }
  function shiftLabel(id?: string | null) { const shift = shifts.find(s => s.id === id); return shift ? `${templates.find(t => t.id === shift.templateId)?.name ?? "Ca làm việc"} · ${formatDate(shift.workDate)} · ${shift.scheduledStart}–${shift.scheduledEnd}` : "Chưa tải được thông tin ca"; }
  const time = (value?: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)) : "Không đề nghị";
  async function review(approved: boolean) { if (busy) return; setBusy(true); setError(""); try { await onReview(approved, note.trim()); } catch (e) { setError(e instanceof Error ? e.message : "Không thể xử lý đơn."); } finally { setBusy(false); } }
  return <Modal open title={request.title} size="xl" onClose={() => !busy && onClose()} footer={<>{canReview && <><Button variant="danger" disabled={busy} onClick={() => review(false)}>Từ chối</Button><Button disabled={busy} onClick={() => review(true)}>{busy ? "Đang xử lý..." : "Chấp thuận"}</Button></>}<Button variant="white" disabled={busy} onClick={onClose}>Đóng</Button></>}>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    <p className="mb-2 font-semibold">{requestLabels[request.type]} · {requestStatus[request.status]}</p><p className="mb-4 text-sm text-gray-500">{employee(request.employeeId)} · Gửi ngày {formatDate(request.createdAt)}</p><p className="mb-5 whitespace-pre-wrap break-words text-sm leading-7">{request.content}</p>
    {request.type === "leave" && <p className="mb-4">Nghỉ từ {formatDate(request.leaveStartDate ?? "")} đến {formatDate(request.leaveEndDate ?? "")}</p>}
    {request.type === "advance" && <p className="mb-4">Số tiền đề nghị: <strong>{formatVND(request.advanceAmount)}</strong></p>}
    {(request.type === "shift_swap" || request.type === "work_supplement") && <p className="mb-4 text-sm">Ca nguồn: {shiftLabel(request.sourceShiftId)}</p>}
    {request.type === "shift_swap" && <div className="mb-4 space-y-2 text-sm"><p>Nhân viên đích: {employee(request.targetEmployeeId)}</p>{request.targetShiftId && <p>Ca đích: {shiftLabel(request.targetShiftId)}</p>}<p>Hình thức: {request.shiftSwapMode === "mutual_acceptance" ? "Nhân viên đích phản hồi trên ứng dụng" : "Quản lý duyệt"}</p></div>}
    {request.type === "work_supplement" && <div className="mb-4 text-sm"><p>Giờ vào đề nghị: {time(request.requestedCheckIn)}</p><p>Giờ ra đề nghị: {time(request.requestedCheckOut)}</p></div>}
    {request.attachmentUrl && <p className="mb-4"><a className="text-primary underline" href={request.attachmentUrl} target="_blank" rel="noopener noreferrer">Xem tệp đính kèm</a></p>}
    {request.status !== "pending" && <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm"><p>Người xử lý: {request.reviewedByName ?? "Chưa có thông tin"}</p><p>Thời điểm: {time(request.reviewedAt)}</p><p className="whitespace-pre-wrap">Ghi chú: {request.reviewNote || "Không có"}</p></div>}
    <p className="mb-4 rounded-lg bg-primary-50 p-3 text-sm text-primary">Kết quả duyệt chỉ ghi nhận mẫu đơn. Người quản lý thực hiện thay đổi lịch, giờ chấm công hoặc xử lý lương tại chức năng tương ứng.</p>
    {canReview && <Field label="Ghi chú xử lý"><Textarea aria-label="Ghi chú xử lý" value={note} onChange={e => setNote(e.target.value)} disabled={busy} /></Field>}
  </Modal>;
}
