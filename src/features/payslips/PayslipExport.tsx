"use client";

import { useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faDownload, faSpinner } from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Form";
import { formatVND } from "@/lib/utils";
import type { Payslip } from "@/types";

interface ExportOptions {
  month?: string;
  branch?: string;
  status?: string;
  exportedBy?: string;
}

// Chuẩn hóa Unicode NFC để đảm bảo hiển thị tiếng Việt hoàn hảo trên tất cả các phiên bản Excel
const cleanText = (str?: string | null) => (str || "—").normalize("NFC");

/**
 * Xuất danh sách phiếu lương thành file Microsoft Excel (.xlsx) chuẩn OpenXML
 * Hỗ trợ 100% tiếng Việt UTF-8 có dấu, font Times New Roman chuẩn văn thư, không lỗi font,
 * định dạng số tiền tệ rõ ràng kèm đường viền và màu sắc chuyên nghiệp.
 */
export async function exportPayslipsToExcel(slips: Payslip[], options: ExportOptions = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Hệ thống Quản lý Nhân sự HRM";
  wb.lastModifiedBy = options.exportedBy || "Ban Quản trị HRM";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Bảng thanh toán tiền lương", {
    views: [{ showGridLines: true }],
  });

  // Thiết lập độ rộng cột (Column widths) tối ưu hiển thị không bị cắt chữ
  ws.columns = [
    { key: "stt", width: 8 },      // STT
    { key: "id", width: 22 },       // Mã phiếu lương
    { key: "name", width: 28 },     // Họ và tên nhân viên
    { key: "branch", width: 20 },   // Chi nhánh
    { key: "month", width: 14 },    // Kỳ lương
    { key: "days", width: 12 },     // Ngày công
    { key: "salary", width: 22 },   // Lương cơ bản
    { key: "bonus", width: 20 },    // Tiền thưởng
    { key: "penalty", width: 20 },  // Khấu trừ / Phạt
    { key: "net", width: 24 },      // Tổng thực lĩnh
    { key: "status", width: 18 },   // Trạng thái
    { key: "reason", width: 30 },   // Ghi chú điều chỉnh
  ];

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // 1. Quốc hiệu tiêu ngữ
  const r1 = ws.addRow(["CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
  r1.font = { name: "Times New Roman", size: 12, bold: true, color: { argb: "FF0F172A" } };
  r1.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells("A1:L1");

  const r2 = ws.addRow(["Độc lập - Tự do - Hạnh phúc"]);
  r2.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FF334155" } };
  r2.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells("A2:L2");

  const r3 = ws.addRow(["---------------------------------------"]);
  r3.font = { name: "Times New Roman", size: 10, color: { argb: "FF64748B" } };
  r3.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells("A3:L3");

  ws.addRow([]); // Dòng trống

  // 2. Tiêu đề bảng lương
  const rTitle = ws.addRow(["BẢNG THANH TOÁN TIỀN LƯƠNG NHÂN VIÊN"]);
  rTitle.font = { name: "Times New Roman", size: 14, bold: true, color: { argb: "FF800020" } };
  rTitle.alignment = { horizontal: "center", vertical: "middle" };
  rTitle.height = 28;
  ws.mergeCells("A5:L5");

  const monthLabel = options.month && options.month !== "all" ? `Tháng ${options.month}` : "Tất cả các kỳ";
  const branchLabel = options.branch && options.branch !== "all" ? `Chi nhánh: ${options.branch}` : "Phạm vi: Toàn công ty";
  const statusLabel =
    options.status === "closed" ? "Trạng thái: Đã chốt" : options.status === "pending" ? "Trạng thái: Chưa chốt" : "Tất cả trạng thái";

  const rSub1 = ws.addRow([`Kỳ lương: ${monthLabel}  |  ${branchLabel}  |  ${statusLabel}`]);
  rSub1.font = { name: "Times New Roman", size: 11, italic: true, color: { argb: "FF475569" } };
  rSub1.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells("A6:L6");

  const rSub2 = ws.addRow([`Thời điểm xuất: ${dateStr} ${timeStr}  |  Người thực hiện: ${options.exportedBy || "Ban Quản trị HRM"}`]);
  rSub2.font = { name: "Times New Roman", size: 10, italic: true, color: { argb: "FF64748B" } };
  rSub2.alignment = { horizontal: "center", vertical: "middle" };
  ws.mergeCells("A7:L7");

  ws.addRow([]); // Dòng trống ngăn cách

  // 3. Tiêu đề các cột dữ liệu
  const headerRow = ws.addRow([
    "STT",
    "Mã phiếu lương",
    "Họ và tên nhân viên",
    "Chi nhánh",
    "Kỳ lương",
    "Ngày công",
    "Lương cơ bản (VNĐ)",
    "Tiền thưởng (VNĐ)",
    "Khấu trừ / Phạt (VNĐ)",
    "Tổng thực lĩnh (VNĐ)",
    "Trạng thái",
    "Ghi chú điều chỉnh",
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

  // 4. Dữ liệu từng phiếu lương
  let totalBase = 0;
  let totalBonus = 0;
  let totalPenalty = 0;
  let totalNet = 0;

  slips.forEach((p, idx) => {
    const base = Number(p.salary) || 0;
    const bonus = Number(p.bonus) || 0;
    const penalty = Number(p.penalty) || 0;
    const net = Number(p.total) || 0;

    totalBase += base;
    totalBonus += bonus;
    totalPenalty += penalty;
    totalNet += net;

    const row = ws.addRow([
      idx + 1,
      p.id,
      cleanText(p.employee),
      cleanText(p.branch || "Toàn công ty"),
      cleanText(p.month),
      Number(p.days) || 0,
      base,
      bonus,
      penalty,
      net,
      p.status === "đã chốt" ? "Đã chốt" : "Chưa chốt",
      cleanText(p.reason || ""),
    ]);
    row.height = 22;

    const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Times New Roman", size: 11, color: { argb: "FF0F172A" } };
      cell.border = thinBorder;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };

      if ([1, 2, 5, 11].includes(colNumber)) {
        // Căn giữa: STT, Mã phiếu, Kỳ lương, Trạng thái
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colNumber === 6) {
        // Căn giữa: Ngày công
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.numFmt = "0";
      } else if ([7, 8, 9, 10].includes(colNumber)) {
        // Căn phải: Các cột tiền
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = '#,##0" đ"';
        if (colNumber === 10) {
          // Thực lĩnh: in đậm, màu xanh lá cây đậm
          cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FF047857" } };
        }
      } else {
        // Căn trái: Họ tên, Chi nhánh, Ghi chú
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  });

  // 5. Dòng tổng cộng lũy kế
  const totalRow = ws.addRow([
    "TỔNG CỘNG",
    "",
    `${slips.length} nhân sự`,
    "",
    "",
    "",
    totalBase,
    totalBonus,
    totalPenalty,
    totalNet,
    `${slips.filter((p) => p.status === "đã chốt").length} phiếu đã chốt`,
    "",
  ]);
  totalRow.height = 26;

  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FF0F172A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFB45309" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "double", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };

    if ([1, 2, 3, 4, 5, 11, 12].includes(colNumber)) {
      cell.alignment = { vertical: "middle", horizontal: "center" };
    } else if ([7, 8, 9, 10].includes(colNumber)) {
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.numFmt = '#,##0" đ"';
    } else {
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
  });

  // 6. Xuất buffer và tải về
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const monthFileName = options.month && options.month !== "all" ? options.month.replace(/[^a-zA-Z0-9]/g, "_") : "Tat_Ca_Ky";
  const dateFileStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const fileName = `Bang_Luong_${monthFileName}_${dateFileStr}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  payslips: Payslip[];
  months: string[];
  defaultMonth?: string;
  userName?: string;
}

export default function ExportPayslipModal({
  open,
  onClose,
  payslips,
  months,
  defaultMonth = "all",
  userName,
}: ExportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  // Danh sách các chi nhánh từ danh sách phiếu
  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    payslips.forEach((p) => {
      if (p.branch) set.add(p.branch);
    });
    return Array.from(set).sort();
  }, [payslips]);

  // Lọc phiếu theo tiêu chí xuất
  const targetSlips = useMemo(() => {
    return payslips.filter((p) => {
      const matchMonth = selectedMonth === "all" || p.month === selectedMonth;
      const matchStatus =
        selectedStatus === "all" ||
        (selectedStatus === "closed" && p.status === "đã chốt") ||
        (selectedStatus === "pending" && p.status === "chưa chốt");
      const matchBranch = selectedBranch === "all" || p.branch === selectedBranch;
      return matchMonth && matchStatus && matchBranch;
    });
  }, [payslips, selectedMonth, selectedStatus, selectedBranch]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    let base = 0;
    let bonus = 0;
    let penalty = 0;
    let net = 0;
    targetSlips.forEach((p) => {
      base += Number(p.salary) || 0;
      bonus += Number(p.bonus) || 0;
      penalty += Number(p.penalty) || 0;
      net += Number(p.total) || 0;
    });
    return { base, bonus, penalty, net };
  }, [targetSlips]);

  const handleExport = async () => {
    if (targetSlips.length === 0) {
      alert("Không có phiếu lương nào phù hợp với bộ lọc đã chọn.");
      return;
    }
    setExporting(true);
    try {
      await exportPayslipsToExcel(targetSlips, {
        month: selectedMonth,
        branch: selectedBranch,
        status: selectedStatus,
        exportedBy: userName,
      });
      onClose();
    } catch (e: any) {
      alert(e?.message || "Lỗi khi xuất file Excel phiếu lương");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={exporting ? () => {} : onClose}
      title="Xuất bảng lương nhân viên (Excel)"
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Hủy
          </Button>
          <Button
            onClick={handleExport}
            disabled={targetSlips.length === 0 || exporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {exporting ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" fontSize={15} />
                Đang tạo file...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faFileExcel} fontSize={15} />
                Tải file Excel ({targetSlips.length} phiếu)
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {/* Bộ lọc kỳ lương & chi nhánh */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Kỳ lương cần xuất" className="mb-0">
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={exporting}
            >
              <option value="all">Tất cả các kỳ lương</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Trạng thái phiếu" className="mb-0">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              disabled={exporting}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="closed">Chỉ phiếu đã chốt</option>
              <option value="pending">Chỉ phiếu chưa chốt</option>
            </Select>
          </Field>
        </div>

        {branchOptions.length > 0 && (
          <Field label="Chi nhánh áp dụng" className="mb-0">
            <Select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={exporting}
            >
              <option value="all">Toàn bộ chi nhánh</option>
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  Chi nhánh {b}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {/* Khung tóm tắt số liệu trước khi xuất */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-200">
            <span>Thông tin dữ liệu xuất</span>
            <span className="text-emerald-700 font-bold normal-case flex items-center gap-1">
              <FontAwesomeIcon icon={faFileExcel} /> Excel (.xlsx) chuẩn tiếng Việt
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Số phiếu lương:</span>
              <strong className="text-slate-800 text-sm">
                {targetSlips.length} phiếu
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Tổng lương cơ bản:</span>
              <strong className="text-slate-800">
                {formatVND(stats.base)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Tổng tiền thưởng:</span>
              <strong className="text-emerald-600">
                +{formatVND(stats.bonus)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Tổng khấu trừ/phạt:</span>
              <strong className="text-rose-600">
                -{formatVND(stats.penalty)}
              </strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-xs">
              Tổng chi trả thực lĩnh:
            </span>
            <span className="text-base font-bold text-primary">
              {formatVND(stats.net)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
