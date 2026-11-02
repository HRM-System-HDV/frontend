"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWifi } from "@fortawesome/free-solid-svg-icons";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { WifiConfig } from "@/types";

interface Props {
  configs: WifiConfig[];
}

export default function WifiTableSection({ configs }: Props) {
  const columns: Column<WifiConfig>[] = [
    {
      key: "ssid",
      header: "SSID",
      render: (w) => (
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-info-100 text-info-700 flex items-center justify-center">
            <FontAwesomeIcon icon={faWifi} fontSize={16} />
          </span>
          <span className="font-mono font-semibold text-gray-800">{w.ssid}</span>
        </div>
      ),
    },
    {
      key: "bssid",
      header: "BSSID (Địa chỉ MAC)",
      render: (w) => <span className="font-mono text-xs text-gray-500">{w.bssid}</span>,
    },
    {
      key: "branch",
      header: "Chi nhánh",
      render: (w) => <Badge tone="gray">{w.branch}</Badge>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (w) => <StatusBadge status={w.status} />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Danh sách Wi-Fi chấm công</CardTitle>
        <Badge tone="gray">{configs.length} cấu hình</Badge>
      </CardHeader>
      <CardBody className="pt-2">
        <Table columns={columns} data={configs} rowKey={(w) => w.id} emptyMessage="Chưa có Wi-Fi nào được cấu hình" />
      </CardBody>
    </Card>
  );
}
