"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faTrashCan, faWifi } from "@fortawesome/free-solid-svg-icons";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { WifiConfig } from "@/types";

interface WifiDetailModalProps {
  config: WifiConfig | null;
  open: boolean;
  onClose: () => void;
  /** Phân giải slug chi nhánh -> tên hiển thị (fallback = chính slug). */
  branchLabel?: (slug: string) => string;
}

export function WifiDetailModal({ config, open, onClose, branchLabel }: WifiDetailModalProps) {
  if (!config) return null;
  const branchName = branchLabel ? branchLabel(config.branch) : config.branch;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chi tiết Wi-Fi chấm công"
      size="md"
      footer={
        <Button variant="white" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100">
          <span className="text-gray-500 font-medium">Tên Wi-Fi (SSID):</span>
          <span className="col-span-2 font-mono font-semibold text-gray-800">{config.ssid}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100">
          <span className="text-gray-500 font-medium">BSSID (Địa chỉ MAC):</span>
          <span className="col-span-2 font-mono text-gray-700">{config.bssid}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100">
          <span className="text-gray-500 font-medium">Chi nhánh:</span>
          <span className="col-span-2">
            <Badge tone="gray">{branchName}</Badge>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100">
          <span className="text-gray-500 font-medium">Trạng thái:</span>
          <span className="col-span-2">
            <StatusBadge status={config.status} />
          </span>
        </div>
      </div>
    </Modal>
  );
}

interface Props {
  configs: WifiConfig[];
  onDelete?: (id: string) => void | Promise<void>;
  /** Phân giải slug chi nhánh -> tên hiển thị (fallback = chính slug). */
  branchLabel?: (slug: string) => string;
}

export default function WifiTableSection({ configs, onDelete, branchLabel }: Props) {
  const [viewingConfig, setViewingConfig] = useState<WifiConfig | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<WifiConfig | null>(null);
  const label = (slug: string) => (branchLabel ? branchLabel(slug) : slug);

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
      render: (w) => <Badge tone="gray">{label(w.branch)}</Badge>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (w) => <StatusBadge status={w.status} />,
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (w) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1"
            onClick={() => setViewingConfig(w)}
          >
            <FontAwesomeIcon icon={faEye} className="mr-1" />
            Xem
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1"
              onClick={() => setDeletingConfig(w)}
            >
              <FontAwesomeIcon icon={faTrashCan} className="mr-1" />
              Xóa
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Wi-Fi chấm công</CardTitle>
          <Badge tone="gray">{configs.length} cấu hình</Badge>
        </CardHeader>
        <CardBody className="pt-2">
          <Table
            columns={columns}
            data={configs}
            rowKey={(w) => w.id}
            emptyMessage="Chưa có Wi-Fi nào được cấu hình"
          />
        </CardBody>
      </Card>

      {viewingConfig && (
        <WifiDetailModal
          config={viewingConfig}
          open={!!viewingConfig}
          onClose={() => setViewingConfig(null)}
          branchLabel={branchLabel}
        />
      )}

      {deletingConfig && (
        <ConfirmDialog
          open={!!deletingConfig}
          title="Xác nhận xóa Wi-Fi"
          message={`Xác nhận xóa cấu hình Wi-Fi "${deletingConfig.ssid}" khỏi chi nhánh ${label(deletingConfig.branch)}?`}
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          tone="danger"
          onConfirm={async () => {
            if (onDelete && deletingConfig) {
              await onDelete(deletingConfig.id);
            }
            setDeletingConfig(null);
          }}
          onCancel={() => setDeletingConfig(null)}
        />
      )}
    </>
  );
}
