"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faPencil } from "@fortawesome/free-solid-svg-icons";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Form";
import { formatVND } from "@/lib/utils";
import type { Payslip } from "@/types";

interface Props {
  payslips: Payslip[];
  onEdit?: (p: Payslip) => void;
  /** Mở modal xem chi tiết (dùng cho vai trò không có quyền chỉnh sửa). */
  onView?: (p: Payslip) => void;
  onCloseOne?: (p: Payslip) => void;
  onBulkClose?: () => void;
  onGenerate?: () => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  monthOptions: string[];
}

export default function PayslipSection({
  payslips,
  onEdit,
  onView,
  onBulkClose,
  onGenerate,
  selectedMonth,
  onMonthChange,
  monthOptions,
}: Props) {
  // Chỉ 1 nút Chi tiết trong cột Thao tác; chỉnh sửa/chốt nằm trong modal chi tiết.
  const openDetail = onEdit ?? onView;

  const columns: Column<Payslip>[] = [
    {
      key: "employee",
      header: "Nhân viên",
      render: (p) => <span className="font-semibold text-gray-800">{p.employee}</span>,
    },
    {
      key: "month",
      header: "Kỳ lương",
      render: (p) => <Badge tone="gray">{p.month}</Badge>,
    },
    {
      key: "days",
      header: "Công",
      render: (p) => (
        <span className="text-gray-600">
          {p.days == null ? "Chưa có thông tin" : p.days > 0 ? `${p.days} ngày công` : "0 ngày công"}
        </span>
      ),
    },
    {
      key: "salary",
      header: "Lương cơ bản",
      render: (p) => <span className="text-gray-700">{formatVND(p.salary ?? p.baseSalary ?? 0)}</span>,
    },
    {
      key: "bonus",
      header: "Thưởng",
      render: (p) => <span className="text-success">{formatVND(p.bonus ?? 0)}</span>,
    },
    {
      key: "penalty",
      header: "Phạt",
      render: (p) => <span className="text-danger">{formatVND(p.penalty ?? p.totalPenalty ?? 0)}</span>,
    },
    {
      key: "total",
      header: "Tổng lương",
      render: (p) => <span className="font-bold text-gray-800">{formatVND(p.total ?? p.netSalary ?? 0)}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (p) => <StatusBadge status={p.status} />,
    },
    // Nút Chi tiết mở modal đầy đủ chức năng (chỉnh thưởng/phạt, chốt).
    // Vai trò chỉ xem vẫn mở được modal chi tiết ở chế độ đọc.
    ...(openDetail
      ? [
          {
            key: "actions",
            header: "Thao tác",
            render: (p: Payslip) => (
              <button
                type="button"
                onClick={() => openDetail(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs"
              >
                Chi tiết
              </button>
            ),
          } as Column<Payslip>,
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phiếu lương theo tháng</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            className="w-auto py-1.5"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
          >
            <option value="all">Tất cả các kỳ</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </Select>

          {onGenerate && (
            <Button size="sm" variant="white" onClick={onGenerate}>
              <FontAwesomeIcon icon={faPencil} fontSize={14} /> Tạo phiếu lương tháng
            </Button>
          )}

          {onBulkClose && (
            <Button size="sm" onClick={onBulkClose}>
              <FontAwesomeIcon icon={faLock} fontSize={14} /> Chốt phiếu lương
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="pt-2">
        <Table
          columns={columns}
          data={payslips}
          rowKey={(p) => p.id}
          emptyMessage="Chưa có phiếu lương nào"
        />
      </CardBody>
    </Card>
  );
}
