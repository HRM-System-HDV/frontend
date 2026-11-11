"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashCan,
  faFileExcel,
  faDownload,
  faTriangleExclamation,
  faCircleCheck,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { formatDate, formatDateTime, formatVND, getTodayVN } from "@/lib/utils";
import { apiDelete, apiGet, GatewayError } from "@/lib/api";
import type { Employee, Branch, Department } from "@/types";
import ExcelJS from "exceljs";

interface PayslipData {
  id: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  totalPenalty: number;
  netSalary: number;
  status: string;
  issuedAt: string;
}

interface ShiftData {
  id: string;
  employeeId?: string;
  employee?: string;
  branchSlug?: string;
  branch?: string;
  date: string;
  template?: string;
  templateName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  scheduled?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string;
  note?: string;
}

interface Props {
  open: boolean;
  employee: Employee | null;
  branches?: Branch[];
  departments?: Department[];
  currentUserEmail?: string;
  currentUserId?: string;
  onClose: () => void;
  onDeleted: (employee: Employee) => void;
}

// Chuẩn hóa Unicode NFC để đảm bảo hiển thị tiếng Việt hoàn hảo trên tất cả các phiên bản Excel
const cleanText = (str?: string | null) => (str || "—").normalize("NFC");

export default function EmployeeDeleteModal({
  open,
  employee,
  branches = [],
  departments = [],
  currentUserEmail,
  currentUserId,
  onClose,
  onDeleted,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [downloadedFileName, setDownloadedFileName] = useState("");
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!employee) return null;

  // Kiểm tra tài khoản bản thân
  const isSelf =
    employee.id === currentUserId ||
    (currentUserEmail && employee.email && employee.email.toLowerCase() === currentUserEmail.toLowerCase());

  const getBranchLabel = (slug?: string) => {
    if (!slug) return "Chưa phân công";
    const b = branches.find(
      (item) => item.slug?.toLowerCase() === slug.toLowerCase() || item.name?.toLowerCase() === slug.toLowerCase()
    );
    return b ? `${b.name} (${b.slug})` : slug;
  };

  // Tính số giờ làm việc từ 2 chuỗi HH:mm
  const calculateHours = (start?: string | null, end?: string | null): number => {
    if (!start || !end) return 0;
    try {
      const [h1, m1] = start.split(":").map(Number);
      const [h2, m2] = end.split(":").map(Number);
      if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
      let diffMinutes = h2 * 60 + m2 - (h1 * 60 + m1);
      if (diffMinutes < 0) diffMinutes += 24 * 60; // qua đêm
      return Math.round((diffMinutes / 60) * 10) / 10;
    } catch {
      return 0;
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    setError(null);
    try {
      // 1. Tải dữ liệu phiếu lương (qua client @/lib/api để dùng chung phiên + envelope)
      let payslips: PayslipData[] = [];
      try {
        const list = await apiGet<PayslipData[]>(
          `/api/payroll/payslips?employeeId=${encodeURIComponent(employee.id)}`
        );
        payslips = (Array.isArray(list) ? list : []).filter(
          (p) => p.employeeId === employee.id
        );
      } catch (e) {
        console.warn("Không thể tải phiếu lương chi tiết:", e);
      }

      // 2. Tải dữ liệu ca làm việc
      let shifts: ShiftData[] = [];
      try {
        const list = await apiGet<ShiftData[]>(
          `/api/shifts?employeeId=${encodeURIComponent(employee.id)}`
        );
        shifts = (Array.isArray(list) ? list : []).filter(
          (s) => s.employeeId === employee.id || (s.employee && s.employee === employee.name)
        );
      } catch (e) {
        console.warn("Không thể tải ca làm việc:", e);
      }

      // Sắp xếp phiếu lương theo tháng giảm dần
      payslips.sort((a, b) => (b.month || "").localeCompare(a.month || ""));

      // 3. Khởi tạo Workbook ExcelJS với font chữ chuẩn Times New Roman
      const wb = new ExcelJS.Workbook();
      wb.creator = "Hệ thống Quản lý Nhân sự HRM";
      wb.lastModifiedBy = "Hệ thống Quản lý Nhân sự HRM";
      wb.created = new Date();
      wb.modified = new Date();

      // Kiểu viền mỏng tiêu chuẩn cho ô dữ liệu
      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };

      // ==========================================
      // SHEET 1: HỒ SƠ NHÂN SỰ CHI TIẾT
      // ==========================================
      const wsProfile = wb.addWorksheet("1. Hồ sơ nhân sự", {
        views: [{ showGridLines: true }],
      });

      wsProfile.columns = [
        { key: "colA", width: 36 },
        { key: "colB", width: 62 },
      ];

      // Quốc hiệu Tiêu ngữ
      const r1 = wsProfile.addRow(["CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
      r1.font = { name: "Times New Roman", size: 12, bold: true, color: { argb: "FF0F172A" } };
      r1.alignment = { horizontal: "center", vertical: "middle" };
      wsProfile.mergeCells("A1:B1");

      const r2 = wsProfile.addRow(["Độc lập - Tự do - Hạnh phúc"]);
      r2.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FF334155" } };
      r2.alignment = { horizontal: "center", vertical: "middle" };
      wsProfile.mergeCells("A2:B2");

      const r3 = wsProfile.addRow(["---------------------------------------"]);
      r3.font = { name: "Times New Roman", size: 10, color: { argb: "FF64748B" } };
      r3.alignment = { horizontal: "center", vertical: "middle" };
      wsProfile.mergeCells("A3:B3");

      wsProfile.addRow([]); // Dòng trống

      // Tiêu đề hồ sơ
      const rTitle = wsProfile.addRow(["HỒ SƠ NHÂN SỰ & DỮ LIỆU LƯU TRỮ TRƯỚC KHI XÓA KHỎI HỆ THỐNG"]);
      rTitle.font = { name: "Times New Roman", size: 14, bold: true, color: { argb: "FF800020" } };
      rTitle.alignment = { horizontal: "center", vertical: "middle" };
      rTitle.height = 28;
      wsProfile.mergeCells("A5:B5");

      const rSub1 = wsProfile.addRow([`Thời điểm trích xuất dữ liệu: ${formatDateTime(new Date())}`]);
      rSub1.font = { name: "Times New Roman", size: 10, italic: true, color: { argb: "FF475569" } };
      rSub1.alignment = { horizontal: "center" };
      wsProfile.mergeCells("A6:B6");

      const rSub2 = wsProfile.addRow(["Mục đích: Lưu trữ bắt buộc phục vụ công tác thanh tra/kiểm toán trước khi xóa vĩnh viễn"]);
      rSub2.font = { name: "Times New Roman", size: 10, italic: true, color: { argb: "FF475569" } };
      rSub2.alignment = { horizontal: "center" };
      wsProfile.mergeCells("A7:B7");

      wsProfile.addRow([]); // Dòng trống

      const fullAddress = cleanText([employee.street, employee.ward, employee.province].filter(Boolean).join(", "));
      const branchName = cleanText(getBranchLabel(employee.branchSlug || employee.branch));

      // Hàm helper thêm section header cho Sheet 1
      const addSectionHeader = (title: string) => {
        const row = wsProfile.addRow([title, ""]);
        row.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        row.alignment = { vertical: "middle" };
        row.height = 24;
        wsProfile.mergeCells(`A${row.number}:B${row.number}`);
        row.eachCell((cell) => {
          cell.border = thinBorder;
        });
      };

      // Hàm helper thêm dòng dữ liệu (key - value)
      const addDataRow = (label: string, value: string | number) => {
        const row = wsProfile.addRow([label, value]);
        row.height = 22;
        const cellA = row.getCell(1);
        const cellB = row.getCell(2);

        cellA.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FF334155" } };
        cellA.alignment = { vertical: "middle", horizontal: "left" };
        cellA.border = thinBorder;
        cellA.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

        cellB.font = { name: "Times New Roman", size: 11, color: { argb: "FF0F172A" } };
        cellB.alignment = { vertical: "middle", horizontal: "left" };
        cellB.border = thinBorder;
      };

      // Phần I
      addSectionHeader("I. THÔNG TIN CÁ NHÂN & ĐỊNH DANH");
      addDataRow("Mã nhân viên (ID):", cleanText(employee.id));
      addDataRow("Họ và tên nhân sự:", cleanText(employee.name));
      addDataRow("Email công vụ / liên hệ:", cleanText(employee.email));
      addDataRow("Số điện thoại di động:", cleanText(employee.phone));
      addDataRow("Giới tính:", cleanText(employee.gender));
      addDataRow("Ngày tháng năm sinh:", cleanText(formatDate(employee.birthDate)));
      addDataRow("Số CCCD / CMND định danh:", cleanText(employee.cccd));
      addDataRow("Ngày cấp CCCD:", cleanText(formatDate(employee.issueDate)));
      addDataRow("Nơi cấp CCCD:", cleanText(employee.issuePlace));
      addDataRow("Địa chỉ cư trú hiện tại:", fullAddress);

      // Phần II
      addSectionHeader("II. VỊ TRÍ CÔNG TÁC & PHÂN QUYỀN HỆ THỐNG");
      addDataRow("Chi nhánh làm việc:", branchName);
      addDataRow("Phòng ban trực thuộc:", cleanText(employee.department));
      addDataRow("Chức danh chuyên môn:", cleanText(employee.role));
      addDataRow(
        "Vai trò hệ thống:",
        employee.systemRole === "admin"
          ? "Quản trị viên (Admin)"
          : employee.systemRole === "manager"
          ? "Quản lý chi nhánh (Manager)"
          : "Nhân viên (Staff)"
      );
      addDataRow("Trạng thái công tác:", employee.status === "đang làm" ? "Đang làm việc" : "Đã vô hiệu hóa");
      addDataRow("Ngày vào làm việc chính thức:", cleanText(formatDate(employee.joinDate)));

      // Phần III
      addSectionHeader("III. CHÍNH SÁCH TIỀN LƯƠNG & TÀI KHOẢN NGÂN HÀNG");
      addDataRow("Mức lương cơ bản quy định:", Number(employee.baseSalary || 0).toLocaleString("vi-VN") + " VNĐ");
      addDataRow("Hình thức tính lương:", employee.salaryType === "hourly" ? "Theo giờ làm việc" : "Theo tháng cố định");
      addDataRow("Số tài khoản ngân hàng chi trả:", cleanText(employee.bankAccountNumber));
      addDataRow("Tên ngân hàng thụ hưởng:", cleanText(employee.bankName));
      addDataRow("Chủ tài khoản ngân hàng:", cleanText(employee.bankAccountName || employee.name));

      // Phần IV
      addSectionHeader("IV. TỔNG KẾT DỮ LIỆU TÍCH LŨY TRÊN HỆ THỐNG");
      addDataRow("Tổng số phiếu lương đã ghi nhận:", `${payslips.length} tháng`);
      addDataRow("Số phiếu lương đã chốt chi trả:", `${payslips.filter((p) => p.status === "đã chốt").length} tháng`);
      addDataRow("Tổng số ca làm việc đã tham gia:", `${shifts.length} ca`);

      // ==========================================
      // SHEET 2: LỊCH SỬ TIỀN LƯƠNG TẤT CẢ CÁC THÁNG
      // ==========================================
      const wsSalary = wb.addWorksheet("2. Lịch sử tiền lương", {
        views: [{ showGridLines: true }],
      });

      wsSalary.columns = [
        { key: "stt", width: 8 },
        { key: "id", width: 22 },
        { key: "month", width: 16 },
        { key: "base", width: 22 },
        { key: "bonus", width: 20 },
        { key: "penalty", width: 20 },
        { key: "net", width: 24 },
        { key: "status", width: 18 },
        { key: "issuedAt", width: 24 },
      ];

      const sTitle1 = wsSalary.addRow(["BẢNG KÊ TIỀN LƯƠNG TẤT CẢ CÁC THÁNG VÀ PHIẾU LƯƠNG ĐÃ CHỐT"]);
      sTitle1.font = { name: "Times New Roman", size: 14, bold: true, color: { argb: "FF800020" } };
      sTitle1.alignment = { horizontal: "center", vertical: "middle" };
      sTitle1.height = 28;
      wsSalary.mergeCells("A1:I1");

      const sTitle2 = wsSalary.addRow([
        `Nhân sự: ${employee.name} | Mã NV: ${employee.id} | Chi nhánh: ${branchName}`,
      ]);
      sTitle2.font = { name: "Times New Roman", size: 11, italic: true, color: { argb: "FF475569" } };
      sTitle2.alignment = { horizontal: "center", vertical: "middle" };
      wsSalary.mergeCells("A2:I2");

      wsSalary.addRow([]); // Dòng trống

      // Header bảng lương
      const sHeader = wsSalary.addRow([
        "STT",
        "Mã phiếu lương",
        "Tháng làm việc",
        "Lương cơ bản (VNĐ)",
        "Tiền thưởng (VNĐ)",
        "Khấu trừ / Phạt (VNĐ)",
        "Thực lĩnh (VNĐ)",
        "Trạng thái phiếu",
        "Ngày chốt / Phát hành",
      ]);
      sHeader.height = 28;
      sHeader.eachCell((cell) => {
        cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = thinBorder;
      });

      let sumBase = 0;
      let sumBonus = 0;
      let sumPenalty = 0;
      let sumNet = 0;

      if (payslips.length === 0) {
        const noData = wsSalary.addRow([
          "—",
          "Chưa có phiếu lương nào phát sinh trong hệ thống",
          "",
          0,
          0,
          0,
          0,
          "—",
          "—",
        ]);
        noData.height = 24;
        noData.eachCell((cell) => {
          cell.font = { name: "Times New Roman", size: 11, italic: true };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = thinBorder;
        });
      } else {
        payslips.forEach((p, idx) => {
          const base = Number(p.baseSalary) || 0;
          const bonus = Number(p.bonus) || 0;
          const penalty = Number(p.totalPenalty) || 0;
          const net = Number(p.netSalary) || 0;

          sumBase += base;
          sumBonus += bonus;
          sumPenalty += penalty;
          sumNet += net;

          const row = wsSalary.addRow([
            idx + 1,
            p.id,
            cleanText(p.month),
            base,
            bonus,
            penalty,
            net,
            p.status === "đã chốt" ? "Đã chốt" : "Chưa chốt",
            p.issuedAt ? formatDateTime(p.issuedAt) : "—",
          ]);
          row.height = 22;

          // Tô màu xen kẽ
          const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";

          row.eachCell((cell, colNumber) => {
            cell.font = { name: "Times New Roman", size: 11, color: { argb: "FF0F172A" } };
            cell.border = thinBorder;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };

            if ([1, 2, 3, 8, 9].includes(colNumber)) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            } else {
              cell.alignment = { vertical: "middle", horizontal: "right" };
              cell.numFmt = '#,##0" đ"';
            }

            if (colNumber === 7) {
              cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FF047857" } };
            }
          });
        });

        // Dòng tổng cộng
        const sTotal = wsSalary.addRow([
          "TỔNG CỘNG",
          "",
          `${payslips.length} tháng`,
          sumBase,
          sumBonus,
          sumPenalty,
          sumNet,
          `${payslips.filter((p) => p.status === "đã chốt").length} phiếu đã chốt`,
          "",
        ]);
        sTotal.height = 26;
        sTotal.eachCell((cell, colNumber) => {
          cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FF0F172A" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFB45309" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "double", color: { argb: "FF0F172A" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          };

          if ([1, 2, 3, 8, 9].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "right" };
            cell.numFmt = '#,##0" đ"';
          }
        });
      }

      // ==========================================
      // SHEET 3: CHẤM CÔNG & SỐ GIỜ LÀM VIỆC
      // ==========================================
      const wsShifts = wb.addWorksheet("3. Chấm công & Ca làm", {
        views: [{ showGridLines: true }],
      });

      wsShifts.columns = [
        { key: "stt", width: 8 },
        { key: "id", width: 22 },
        { key: "date", width: 16 },
        { key: "template", width: 18 },
        { key: "branch", width: 18 },
        { key: "sched", width: 18 },
        { key: "checkIn", width: 14 },
        { key: "checkOut", width: 14 },
        { key: "hours", width: 18 },
        { key: "status", width: 18 },
        { key: "note", width: 30 },
      ];

      const shTitle1 = wsShifts.addRow(["BẢNG KÊ LỊCH SỬ CHẤM CÔNG VÀ GIỜ LÀM VIỆC CỦA NHÂN VIÊN"]);
      shTitle1.font = { name: "Times New Roman", size: 14, bold: true, color: { argb: "FF800020" } };
      shTitle1.alignment = { horizontal: "center", vertical: "middle" };
      shTitle1.height = 28;
      wsShifts.mergeCells("A1:K1");

      const shTitle2 = wsShifts.addRow([
        `Nhân sự: ${employee.name} | Mã NV: ${employee.id} | Tổng số ca đã phân công: ${shifts.length}`,
      ]);
      shTitle2.font = { name: "Times New Roman", size: 11, italic: true, color: { argb: "FF475569" } };
      shTitle2.alignment = { horizontal: "center", vertical: "middle" };
      wsShifts.mergeCells("A2:K2");

      wsShifts.addRow([]); // Dòng trống

      // Header bảng chấm công
      const shHeader = wsShifts.addRow([
        "STT",
        "Mã ca làm",
        "Ngày làm việc",
        "Khung ca",
        "Chi nhánh",
        "Giờ theo lịch",
        "Giờ Check-in",
        "Giờ Check-out",
        "Số giờ làm (giờ)",
        "Trạng thái ca",
        "Ghi chú",
      ]);
      shHeader.height = 28;
      shHeader.eachCell((cell) => {
        cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = thinBorder;
      });

      let totalHoursWorked = 0;
      let completedCount = 0;

      if (shifts.length === 0) {
        const noShift = wsShifts.addRow([
          "—",
          "Chưa có dữ liệu ca làm việc nào được ghi nhận",
          "",
          "",
          "",
          "",
          "",
          "",
          0,
          "—",
          "",
        ]);
        noShift.height = 24;
        noShift.eachCell((cell) => {
          cell.font = { name: "Times New Roman", size: 11, italic: true };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = thinBorder;
        });
      } else {
        shifts.forEach((s, idx) => {
          const tmpl = cleanText(s.template || s.templateName || "Ca chuẩn");
          const sched = cleanText(
            s.scheduled || (s.scheduledStart && s.scheduledEnd ? `${s.scheduledStart} - ${s.scheduledEnd}` : "—")
          );
          const hours =
            s.checkIn && s.checkOut
              ? calculateHours(s.checkIn, s.checkOut)
              : calculateHours(s.scheduledStart, s.scheduledEnd);

          if (s.status === "Đúng giờ" || s.status === "completed" || s.status === "dang làm" || s.checkOut) {
            completedCount++;
            totalHoursWorked += hours;
          }

          const row = wsShifts.addRow([
            idx + 1,
            s.id,
            cleanText(formatDate(s.date)),
            tmpl,
            cleanText(s.branch || s.branchSlug || "—"),
            sched,
            cleanText(s.checkIn),
            cleanText(s.checkOut),
            hours,
            cleanText(s.status === "Chưa làm" ? "Chưa chấm công" : (s.status || "Chưa chấm công")),
            cleanText(s.note || ""),
          ]);
          row.height = 22;

          const bgArgb = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";

          row.eachCell((cell, colNumber) => {
            cell.font = { name: "Times New Roman", size: 11, color: { argb: "FF0F172A" } };
            cell.border = thinBorder;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };

            if ([1, 2, 3, 4, 6, 7, 8, 10].includes(colNumber)) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            } else if (colNumber === 9) {
              cell.alignment = { vertical: "middle", horizontal: "right" };
              cell.numFmt = '0.0" giờ"';
            } else {
              cell.alignment = { vertical: "middle", horizontal: "left" };
            }
          });
        });

        // Dòng tổng kết ca làm
        const shTotal = wsShifts.addRow([
          "TỔNG CỘNG",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          Math.round(totalHoursWorked * 10) / 10,
          `Đã hoàn thành ${completedCount}/${shifts.length} ca`,
          "",
        ]);
        shTotal.height = 26;
        shTotal.eachCell((cell, colNumber) => {
          cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FF0F172A" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFB45309" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "double", color: { argb: "FF0F172A" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          };

          if (colNumber === 9) {
            cell.alignment = { vertical: "middle", horizontal: "right" };
            cell.numFmt = '0.0" giờ"';
          } else {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          }
        });
      }

      // Xuất file và kích hoạt tải về trên trình duyệt
      const safeName = employee.name.trim().replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, "_");
      // Ngày VN không dấu "/" (tên file không cho phép ký tự "/")
      const dateStr = getTodayVN().replace(/\//g, "");
      const fileName = `Ho_So_Luu_Tru_${employee.id}_${safeName}_${dateStr}.xlsx`;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);

      setDownloadedFileName(fileName);
      setHasDownloaded(true);
    } catch (err: any) {
      console.error("Lỗi khi tạo file Excel:", err);
      setError(err?.message || "Lỗi khi trích xuất và tải file Excel lưu trữ");
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isSelf) {
      setError("Không thể xóa tài khoản của chính bạn đang đăng nhập!");
      return;
    }

    if (!hasDownloaded) {
      setError("Bạn bắt buộc phải tải file Excel lưu trữ dữ liệu trước khi xóa nhân viên này!");
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      // apiDelete ném GatewayError (kèm message thật từ service) khi request lỗi,
      // đồng thời tự ghi nhật ký xóa vào backlog như mọi thao tác ghi khác.
      await apiDelete(`/api/employees/${encodeURIComponent(employee.id)}`);

      onDeleted(employee);
      onClose();
    } catch (err: any) {
      setError(err instanceof GatewayError ? err.message : err?.message || "Lỗi khi thực hiện xóa nhân viên");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={deleting ? () => {} : onClose}
      title="Xác nhận xóa vĩnh viễn nhân sự"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="white" onClick={onClose} disabled={deleting}>
            Hủy
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="danger"
              disabled={!hasDownloaded || !confirmedCheck || deleting || !!isSelf}
              onClick={handleConfirmDelete}
              className={!hasDownloaded || !confirmedCheck || isSelf ? "opacity-50 cursor-not-allowed" : ""}
            >
              {deleting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1.5" />
                  Đang xóa vĩnh viễn...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrashCan} className="mr-1.5" />
                  Xác nhận
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {/* CẢNH BÁO NẾU LÀ TÀI KHOẢN ĐANG ĐĂNG NHẬP */}
        {isSelf && (
          <div className="p-3.5 rounded-xl bg-red-100 border border-red-300 text-red-900 flex items-start gap-3">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-600 text-lg mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="font-bold text-sm">Hành động bị nghiêm cấm: Không thể tự xóa tài khoản của chính mình!</div>
              <p className="text-xs text-red-800 leading-relaxed">
                Bạn đang đăng nhập bằng chính tài khoản của nhân viên <strong>{employee.name} ({employee.id})</strong>. Hệ thống không cho phép người dùng tự xóa tài khoản của mình nhằm bảo đảm tính toàn vẹn phiên làm việc và bảo mật kiểm toán.
              </p>
            </div>
          </div>
        )}

        {/* THẺ TỔNG QUAN NHÂN SỰ CẦN XÓA */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-3.5 mb-3 pb-3 border-b border-gray-200">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-12 h-12 rounded-full object-cover border border-primary/20 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                {employee.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 text-base">{employee.name}</h4>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono font-semibold bg-gray-200 text-gray-700">
                  {employee.id}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    employee.status === "đang làm"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {employee.status === "đang làm" ? "Đang làm việc" : "Đã vô hiệu hóa"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500 mt-2.5 pt-2.5 border-t border-gray-200">
                <div>
                  <span className="text-gray-400 block text-[11px]">Email:</span>
                  <strong className="text-gray-700 block truncate" title={employee.email}>{employee.email || "—"}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Số điện thoại:</span>
                  <strong className="text-gray-700 block">{employee.phone || "—"}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Chi nhánh:</span>
                  <strong className="text-gray-700 block truncate" title={getBranchLabel(employee.branchSlug || employee.branch)}>{getBranchLabel(employee.branchSlug || employee.branch)}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Phòng ban:</span>
                  <strong className="text-gray-700 block truncate" title={employee.department}>{employee.department || "—"}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
            <div className="p-2.5 rounded-lg bg-white border border-gray-200">
              <span className="text-gray-400 block text-[11px]">Chức danh / Vai trò:</span>
              <span className="font-semibold text-gray-800 block truncate">{employee.role || "Nhân viên"}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-gray-200">
              <span className="text-gray-400 block text-[11px]">Lương cơ bản:</span>
              <span className="font-semibold text-emerald-700 block">{formatVND(employee.baseSalary || 0)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-gray-200">
              <span className="text-gray-400 block text-[11px]">Ngày vào làm:</span>
              <span className="font-semibold text-gray-800 block">{formatDate(employee.joinDate) || "—"}</span>
            </div>
          </div>
        </div>

        {/* QUY ĐỊNH BẮT BUỘC TẢI FILE EXCEL */}
        {!isSelf && (
          <div className="p-4 rounded-xl border transition-all space-y-2.5 bg-amber-50/70 border-amber-200 text-amber-950">
            <div className="flex items-start gap-2.5">
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600 text-base mt-0.5 shrink-0" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-amber-900">
                  Quy định bắt buộc: Tải file Excel lưu trữ hồ sơ & toàn bộ dữ liệu lương
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Để đảm bảo tính toàn vẹn hồ sơ nhân sự và phục vụ công tác thanh tra/kiểm toán, trước khi xóa vĩnh viễn nhân sự này khỏi hệ thống, bạn <strong>bắt buộc phải tải về 01 file Excel tổng hợp</strong> bao gồm:
                </p>
                <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5 pt-1">
                  <li><strong>Sheet 1:</strong> Toàn bộ thông tin nhân sự (Định danh, CCCD, địa chỉ, vị trí, tài khoản ngân hàng).</li>
                  <li><strong>Sheet 2:</strong> Tiền lương của tất cả các tháng & tất cả các phiếu lương đã chốt từ trước đến nay.</li>
                  <li><strong>Sheet 3:</strong> Lịch sử chấm công, số giờ làm việc thực tế và toàn bộ các ca làm việc.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* KHỐI NÚT TẢI EXCEL (TÁCH THÀNH 1 DIV RIÊNG BIỆT) */}
        {!isSelf && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faFileExcel} className="text-emerald-600 text-sm" />
                File lưu trữ
              </div>
              <div className="text-[11px] text-gray-500">
                {hasDownloaded ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-600" />
                    Đã tải thành công: <strong>{downloadedFileName}</strong>
                  </span>
                ) : (
                  "Chưa tải về file dữ liệu. Nút xác nhận xóa đang bị khóa."
                )}
              </div>
            </div>

            <Button
              type="button"
              variant={hasDownloaded ? "white" : "primary"}
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="shrink-0 text-xs py-2 px-4 shadow-xs"
            >
              {downloading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1.5" />
                  Đang tải xuống...
                </>
              ) : hasDownloaded ? (
                <>
                  <FontAwesomeIcon icon={faDownload} className="mr-1.5 text-gray-500" />
                  Tải lại
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faDownload} className="mr-1.5" />
                  Tải xuống
                </>
              )}
            </Button>
          </div>
        )}

        {/* Ô XÁC NHẬN KHI ĐÃ TẢI FILE */}
        {!isSelf && hasDownloaded && (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-600 text-sm" />
              Điều kiện tải file đã thỏa mãn — Nút xóa vĩnh viễn đã được mở khóa
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer pt-1 select-none">
              <input
                type="checkbox"
                checked={confirmedCheck}
                onChange={(e) => setConfirmedCheck(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                Tôi xác nhận đã lưu trữ an toàn file Excel trên máy tính nội bộ và hoàn toàn hiểu rằng hành động xóa này sẽ <strong>xóa vĩnh viễn hồ sơ của nhân sự &quot;{employee.name}&quot;</strong> và không thể hoàn tác.
              </span>
            </label>
          </div>
        )}

        {/* THÔNG BÁO LỖI NẾU CÓ */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
