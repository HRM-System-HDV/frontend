"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Form";
import type { WorkShift } from "@/features/shifts/types";

interface Props {
  open: boolean;
  onClose: () => void;
  workShifts?: WorkShift[];
}

function buildCsv(shifts: WorkShift[]) {
  const headers = ["Nhân viên", "Chi nhánh", "Ngày", "Khung ca", "Ca làm", "Check-in", "Check-out", "Trạng thái"];
  const rows = shifts.map((s) =>
    [s.employee, s.branch, s.date, s.templateName, s.scheduled, s.checkIn, s.checkOut, s.status]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.map((h) => `"${h}"`).join(","), ...rows].join("\n");
}

export default function ExportModal({ open, onClose, workShifts = [] }: Props) {
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const [error, setError] = useState("");

  const handleExport = () => {
    if (workShifts.length === 0) {
      setError("Không có dữ liệu ca làm việc để xuất.");
      return;
    }
    const csv = "\uFEFF" + buildCsv(workShifts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ca-lam-viec-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xuất báo cáo ca làm việc"
      size="md"
      footer={
        <>
          <Button variant="white" onClick={onClose}>Hủy</Button>
          <Button onClick={handleExport}>
            <FontAwesomeIcon icon={faDownload} fontSize={16} /> Xuất file CSV
          </Button>
        </>
      }
    >
      {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
      <Field label="Khoảng thời gian" required>
        <Select value={range} onChange={(e) => setRange(e.target.value as "day" | "week" | "month")}>
          <option value="day">Hôm nay</option>
          <option value="week">Tuần này</option>
          <option value="month">Tháng này</option>
        </Select>
      </Field>
      <p className="text-xs text-gray-400 mt-2">
        File CSV sẽ gồm {workShifts.length} bản ghi ca làm việc hiện có.
      </p>
    </Modal>
  );
}
