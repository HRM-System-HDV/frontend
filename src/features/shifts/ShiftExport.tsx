"use client";

import { useState } from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Form";
import type { WorkShift } from "@/features/shifts/types";
import { formatDate, formatDateTime, getTodayVN } from "@/lib/utils";
import ExcelJS from "exceljs";

interface Props {
  open: boolean;
  onClose: () => void;
  workShifts?: WorkShift[];
}

const clean = (str?: string | null) => (str || "—").normalize("NFC");

export default function ExportModal({ open, onClose, workShifts = [] }: Props) {
  const [range, setRange] = useLocalStorageState<"day" | "week" | "month">("hrm_shifts_export_range", "week");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    if (workShifts.length === 0) {
      setError("Không có dữ liệu ca làm việc để xuất.");
      return;
    }

    setExporting(true);
    setError("");
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Hệ thống Quản lý Nhân sự HRM";
      wb.created = new Date();

      const ws = wb.addWorksheet("Báo cáo ca làm việc", {
        views: [{ showGridLines: true }],
      });

      ws.columns = [
        { key: "stt", width: 8 },
        { key: "emp", width: 26 },
        { key: "branch", width: 18 },
        { key: "date", width: 16 },
        { key: "template", width: 18 },
        { key: "sched", width: 18 },
        { key: "in", width: 14 },
        { key: "out", width: 14 },
        { key: "status", width: 18 },
      ];

      const rTitle = ws.addRow(["BÁO CÁO PHÂN CÔNG & CHẤM CÔNG CA LÀM VIỆC"]);
      rTitle.font = { name: "Times New Roman", size: 14, bold: true, color: { argb: "FF800020" } };
      rTitle.alignment = { horizontal: "center", vertical: "middle" };
      rTitle.height = 28;
      ws.mergeCells("A1:I1");

      const rangeLabel = range === "day" ? "Hôm nay" : range === "month" ? "Tháng này" : "Tuần này";
      const rSub = ws.addRow([
        `Phạm vi: ${rangeLabel} | Thời điểm trích xuất: ${formatDateTime(new Date())} | Tổng cộng: ${workShifts.length} ca`,
      ]);
      rSub.font = { name: "Times New Roman", size: 10, italic: true, color: { argb: "FF475569" } };
      rSub.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells("A2:I2");

      ws.addRow([]); // Dòng trống

      // Header
      const headerRow = ws.addRow([
        "STT",
        "Nhân viên",
        "Chi nhánh",
        "Ngày làm việc",
        "Khung ca",
        "Ca làm / Giờ lịch",
        "Giờ Check-in",
        "Giờ Check-out",
        "Trạng thái",
      ]);
      headerRow.height = 28;

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };

      headerRow.eachCell((cell) => {
        cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = thinBorder;
      });

      workShifts.forEach((s, idx) => {
        const row = ws.addRow([
          idx + 1,
          clean(s.employee),
          clean(s.branch),
          clean(formatDate(s.date) || "—"),
          clean(s.templateName),
          clean(s.scheduled),
          clean(s.checkIn),
          clean(s.checkOut),
          clean(s.status),
        ]);
        row.height = 22;

        const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Times New Roman", size: 11, color: { argb: "FF0F172A" } };
          cell.border = thinBorder;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };

          if ([1, 3, 4, 5, 6, 7, 8, 9].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          }
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Tên file dùng ngày VN không dấu "/" (tên file không cho phép ký tự "/")
      a.download = `ca-lam-viec-${range}-${getTodayVN().replace(/\//g, "")}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Lỗi khi tạo file Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={exporting ? () => {} : onClose}
      title="Xuất báo cáo ca làm việc (Excel)"
      size="md"
      footer={
        <>
          <Button variant="white" onClick={onClose} disabled={exporting}>
            Hủy
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1.5" />
                Đang xuất file...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faFileExcel} className="mr-1.5 text-emerald-400" />
                Xuất file Excel (.xlsx)
              </>
            )}
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
      <p className="text-xs text-gray-500 mt-2">
        File Excel (.xlsx) sẽ gồm {workShifts.length} bản ghi ca làm việc hiện có, chuẩn định dạng font tiếng Việt không bị lỗi font khi mở trên bất kỳ phiên bản Microsoft Excel nào.
      </p>
    </Modal>
  );
}
