"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Form";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultMonth: string;
  months: string[];
  pendingCount: number;
  saving: boolean;
  onConfirm: (month: string) => void;
}

export default function BulkClosePayslipModal({ open, onClose, defaultMonth, months, pendingCount, saving, onConfirm }: Props) {
  const [month, setMonth] = useState(defaultMonth);

  useEffect(() => {
    if (open) setMonth(defaultMonth);
  }, [open, defaultMonth]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chốt phiếu lương"
      size="md"
      footer={
        <>
          <Button variant="white" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={() => onConfirm(month)} disabled={saving}>
            {saving ? "Đang chốt..." : `Chốt${pendingCount > 0 ? ` ${pendingCount} phiếu` : ""}`}
          </Button>
        </>
      }
    >
      <Field label="Kỳ lương (theo tháng)" required>
        <div className="grid grid-cols-2 gap-2">
          <Select value={month} onChange={(e) => setMonth(e.target.value)} disabled={saving}>
            {months.length === 0 ? (
              <option value="">Chưa có kỳ lương</option>
            ) : (
              months.map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))
            )}
          </Select>
          <Select defaultValue="2026" disabled>
            <option value="2026">2026</option>
          </Select>
        </div>
      </Field>
    </Modal>
  );
}
