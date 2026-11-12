import type { Payslip } from "@/types";
import { labels } from "./model";
interface ExportOptions { names?: Map<string, string>; branchNames?: Map<string, string> }
/** Giữ tiền dưới dạng chuỗi để Excel không làm mất chữ số của Decimal. */
export async function exportPayslipsToExcel(slips: Payslip[], options: ExportOptions = {}) {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Phiếu lương");
    sheet.columns = [
        { header: "Mã phiếu", key: "id", width: 38 },
        { header: "Nhân viên", key: "employee", width: 28 },
        { header: "Chi nhánh", key: "branch", width: 28 },
        { header: "Kỳ lương", key: "month", width: 14 },
        { header: "Lương tích lũy (VNĐ)", key: "baseSalary", width: 24 },
        { header: "Thưởng (VNĐ)", key: "bonus", width: 22 },
        { header: "Phạt (VNĐ)", key: "totalPenalty", width: 22 },
        { header: "Thực lĩnh (VNĐ)", key: "netSalary", width: 24 },
        { header: "Trạng thái", key: "status", width: 22 },
        { header: "Người xác nhận", key: "confirmedBy", width: 38 },
        { header: "Thời điểm xác nhận", key: "confirmedAt", width: 28 },
        { header: "Mã lệnh chi", key: "payoutId", width: 38 },
    ];
    for (const slip of slips) sheet.addRow({
        ...slip,
        employee: options.names?.get(slip.employeeId) || slip.employeeId,
        branch: slip.branchId ? options.branchNames?.get(slip.branchId) || slip.branchId : "",
        status: labels[slip.status],
        confirmedAt: slip.confirmedAt ? new Date(slip.confirmedAt).toLocaleString("vi-VN") : "",
    });
    sheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Phieu_luong.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

