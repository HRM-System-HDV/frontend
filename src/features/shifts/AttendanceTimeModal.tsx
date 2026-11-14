"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { toInputDateTime } from "@/lib/utils";

export interface AttendanceTimePayload {
  /** ISO có múi giờ — `time.timestamp()` của work-service từ chối chuỗi không có Z/+07:00. */
  checkIn: string;
  checkOut: string;
  penaltyNote?: string;
}

interface Props {
  open: boolean;
  /** "Nguyễn Văn A · 14/11/2026 · 07:00-15:00" — ca đang được sửa giờ. */
  shiftLabel: string;
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: AttendanceTimePayload) => void | Promise<void>;
}

/**
 * PUT /api/attendance/:shiftId bắt buộc đủ cả giờ vào lẫn giờ ra
 * (WorkService.saveAttendance), nên quản trị viên nhập cả hai mốc trong cùng
 * một lần lưu thay vì bấm từng nút như luồng của nhân viên trên Mobile.
 */
export default function AttendanceTimeModal({
  open,
  shiftLabel,
  initialCheckIn,
  initialCheckOut,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [checkIn, setCheckIn] = useState(() => toInputDateTime(initialCheckIn));
  const [checkOut, setCheckOut] = useState(() => toInputDateTime(initialCheckOut));
  const [penaltyNote, setPenaltyNote] = useState("");

  const handleSubmit = () => {
    if (!checkIn || !checkOut) return;
    const payload: AttendanceTimePayload = {
      checkIn: new Date(checkIn).toISOString(),
      checkOut: new Date(checkOut).toISOString(),
    };
    if (penaltyNote.trim()) payload.penaltyNote = penaltyNote.trim();
    onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cập nhật giờ chấm công của ca"
      size="md"
      footer={
        <>
          <Button variant="white" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !checkIn || !checkOut}>
            {saving ? "Đang lưu..." : "Lưu giờ chấm công"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">{shiftLabel}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Giờ vào" required>
            <Input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} disabled={saving} />
          </Field>
          <Field label="Giờ ra" required>
            <Input type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} disabled={saving} />
          </Field>
        </div>
        <Field label="Ghi chú xử phạt (tùy chọn)">
          <Input value={penaltyNote} onChange={(e) => setPenaltyNote(e.target.value)} disabled={saving} placeholder="VD: Nhân viên quên chốt ra, có xác nhận của quản lý" />
        </Field>
      </div>
    </Modal>
  );
}
