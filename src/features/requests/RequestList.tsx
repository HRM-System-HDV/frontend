"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightArrowLeft, faCoins, faPen, faUmbrellaBeach } from "@fortawesome/free-solid-svg-icons";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { ShiftRequest } from "@/types";
import RequestDetailModal from "./RequestDetail";

interface Props {
  requests: ShiftRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ShiftRequestSection({ requests, onApprove, onReject }: Props) {
  const [selectedRequest, setSelectedRequest] = useState<ShiftRequest | null>(null);
  const pendingCount = requests.filter((r) => r.status === "chờ duyệt").length;

  // Giữ request được chọn đồng bộ với danh sách khi duyệt / từ chối
  const currentSelectedRequest = selectedRequest
    ? requests.find((r) => r.id === selectedRequest.id) || selectedRequest
    : null;

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "nghỉ phép":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <FontAwesomeIcon icon={faUmbrellaBeach} fontSize={13} /> Nghỉ phép
          </span>
        );
      case "bổ sung công":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <FontAwesomeIcon icon={faPen} fontSize={13} /> Bổ sung công
          </span>
        );
      case "tạm ứng":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <FontAwesomeIcon icon={faCoins} fontSize={13} /> Tạm ứng lương
          </span>
        );
      case "đổi ca":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <FontAwesomeIcon icon={faArrowRightArrowLeft} fontSize={13} /> Đổi ca
          </span>
        );
    }
  };

  const columns: Column<ShiftRequest>[] = [
    {
      key: "type",
      header: "Loại yêu cầu",
      render: (r) => getTypeBadge(r.type),
    },
    {
      key: "employee",
      header: "Nhân viên",
      render: (r) => <span className="font-semibold text-gray-800">{r.employee}</span>,
    },
    {
      key: "branch",
      header: "Chi nhánh",
      render: (r) => <Badge tone="gray">{r.branch}</Badge>,
    },
    {
      key: "period",
      header: "Thời gian",
      render: (r) => <span className="text-gray-600 text-sm">{r.from} → {r.to}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "Thao tác",
      className: "text-right",
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRequest(r);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs"
        >
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Danh sách yêu cầu phê duyệt (Đổi ca / Nghỉ phép / Bổ sung công)</CardTitle>
          <Badge tone="warning" dot>{pendingCount} chờ phê duyệt</Badge>
        </CardHeader>
        <CardBody className="pt-2">
          <Table
            columns={columns}
            data={requests}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSelectedRequest(r)}
            emptyMessage="Không có yêu cầu nào"
          />
        </CardBody>
      </Card>

      {/* Modal Chi tiết yêu cầu & 2 nút xác nhận Phê duyệt / Từ chối */}
      <RequestDetailModal
        open={!!currentSelectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={currentSelectedRequest}
        onApprove={onApprove}
        onReject={onReject}
      />
    </>
  );
}
