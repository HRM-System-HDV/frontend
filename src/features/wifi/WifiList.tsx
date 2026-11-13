"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faWifi } from "@fortawesome/free-solid-svg-icons";
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
  /** Phân giải branchId chi nhánh -> tên hiển thị (fallback = chính branchId). */
  branchLabel?: (branchId: string) => string;
  /** Chỉ truyền khi người dùng có quyền xóa: nút xóa nằm trong modal chi tiết. */
  onDelete?: () => void;
}

export function WifiDetailModal({ config, open, onClose, branchLabel, onDelete }: WifiDetailModalProps) {
  if (!config) return null;
  const branchName = branchLabel ? branchLabel(config.branchId) : config.branchId;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chi tiết Wi-Fi chấm công"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          {onDelete ? (
            <Button variant="danger" size="sm" onClick={onDelete}>
              <FontAwesomeIcon icon={faTrashCan} className="mr-1.5" />
              Xóa Wi-Fi
            </Button>
          ) : (
            <span />
          )}
          <Button variant="white" onClick={onClose}>
            Đóng
          </Button>
        </div>
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
  /** Phân giải branchId chi nhánh -> tên hiển thị (fallback = chính branchId). */
  branchLabel?: (branchId: string) => string;
}

export default function WifiTableSection({ configs, onDelete, branchLabel }: Props) {
  const [viewingConfig, setViewingConfig] = useState<WifiConfig | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<WifiConfig | null>(null);
  const label = (branchId: string) => (branchLabel ? branchLabel(branchId) : branchId);

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
      key: "branchId",
      header: "Chi nhánh",
      render: (w) => <Badge tone="gray">{label(w.branchId)}</Badge>,
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
        <button
          type="button"
          onClick={() => setViewingConfig(w)}
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
          onDelete={
            onDelete
              ? () => {
                  setDeletingConfig(viewingConfig);
                  setViewingConfig(null);
                }
              : undefined
          }
        />
      )}

      {deletingConfig && (
        <ConfirmDialog
          open={!!deletingConfig}
          title="Xác nhận xóa Wi-Fi"
          message={`Xác nhận xóa cấu hình Wi-Fi "${deletingConfig.ssid}" khỏi chi nhánh ${label(deletingConfig.branchId)}?`}
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
