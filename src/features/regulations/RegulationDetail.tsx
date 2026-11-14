"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faThumbtack,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { apiDownload, apiGet } from "@/lib/api";
import type { Regulation, RegulationFile, Branch } from "@/types";
import { getStatusTone, getCategoryColor } from "./helpers";
import { formatDate } from "@/lib/utils";

interface Props {
  item: Regulation | null;
  onClose: () => void;
  onEdit?: (item: Regulation) => void;
  onDelete?: (id: string, title?: string) => void;
  onTogglePin?: (id: string) => void;
}

export default function RegulationDetailModal({
  item,
  onClose,
  onEdit,
  onDelete,
  onTogglePin,
}: Props) {
  // Component không nhận branches từ page cha (page không fetch) -> tự tải
  // bảng chi nhánh để map branchId -> tên, giống RegulationList.
  const [branches, setBranches] = useState<Branch[]>([]);
  const [files, setFiles] = useState<RegulationFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const itemId = item?.id;

  useEffect(() => {
    if (!itemId) return;
    let ignore = false;
    setFiles([]);
    setFileError("");
    setLoadingFiles(true);
    apiGet<Regulation>(`/api/regulations/${encodeURIComponent(itemId)}`)
      .then(detail => { if (!ignore) setFiles(detail.files || []); })
      .catch(error => { if (!ignore) setFileError(error instanceof Error ? error.message : "Không thể tải danh sách tài liệu."); })
      .finally(() => { if (!ignore) setLoadingFiles(false); });
    return () => { ignore = true; };
  }, [itemId]);

  const fileName = (file: RegulationFile) => {
    const extension = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.mime];
    return `${file.publicId.split("/").pop()}${extension ? `.${extension}` : ""}`;
  };
  const downloadFile = async (file: RegulationFile) => {
    setDownloading(file.id);
    setFileError("");
    try {
      const path = file.publicId.split("/").map(encodeURIComponent).join("/");
      const blob = await apiDownload(`/api/files/${path}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName(file);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Không thể tải tài liệu.");
    } finally { setDownloading(null); }
  };

  useEffect(() => {
    apiGet<Branch[]>("/api/branches").then((d) => setBranches(d || [])).catch(() => {});
  }, []);

  const getBranchDisplayName = (branchId?: string | null) =>
    branches.find((b) => b.id === branchId)?.name || branchId;

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={
        item ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <h5 className="mb-0 font-bold text-base md:text-lg text-slate-800">
              {item.title}
            </h5>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getCategoryColor(
                item.category
              )}`}
            >
              {item.category}
            </span>
            <Badge tone={getStatusTone(item.status)} dot>
              {item.status.toUpperCase()}
            </Badge>
            {item.pinned && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                <FontAwesomeIcon icon={faThumbtack} fontSize={12} /> Đã ghim
              </span>
            )}
            <span className="text-xs text-slate-500 font-medium">
              Phạm vi: <strong className="text-slate-700">{getBranchDisplayName(item.scopeBranchId) || "Toàn công ty"}</strong>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Hiệu lực: <strong className="text-slate-700">{formatDate(item.effectiveDate)}</strong>
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Hết hiệu lực: <strong className="text-slate-700">{item.expiryDate ? formatDate(item.expiryDate) : "Không xác định"}</strong>
            </span>
          </div>
        ) : (
          "Chi tiết nội quy"
        )
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {item && onDelete && (
              <Button
                variant="danger"
                onClick={() => {
                  onClose();
                  onDelete(item.id, item.title);
                }}
                className="flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faTrashCan} fontSize={14} />
                Xóa văn bản
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item && onTogglePin && (
              <Button
                variant="outline"
                onClick={() => onTogglePin(item.id)}
                className={`flex items-center gap-1.5 ${
                  item.pinned
                    ? "text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <FontAwesomeIcon icon={faThumbtack} fontSize={14} />
                {item.pinned ? "Bỏ ghim" : "Ghim đầu trang"}
              </Button>
            )}
            {item && onEdit && (
              <Button
                variant="outline"
                onClick={() => onEdit?.(item)}
                className="flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faPen} fontSize={14} />
                Sửa văn bản
              </Button>
            )}
            <Button variant="primary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      {item && (
        <div className="space-y-5 text-slate-800">
          {/* Tóm tắt */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Mục đích & Tóm tắt:
            </h4>
            <p className="text-sm bg-blue-50/60 p-3.5 rounded-lg border border-blue-100 text-slate-700 italic">
              {item.summary}
            </p>
          </div>

          {/* Toàn văn điều khoản */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Toàn văn điều khoản nội quy:
            </h4>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm whitespace-pre-line leading-relaxed font-sans text-slate-800 max-h-[400px] overflow-y-auto">
              {item.content}
            </div>
          </div>

          {/* Tài liệu đính kèm */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Tài liệu đính kèm ban hành:
              </h4>
              <div className="space-y-2">
                {loadingFiles && <p className="text-sm text-slate-500">Đang tải danh sách tài liệu...</p>}
                {fileError && <p role="alert" className="text-sm text-red-600">{fileError}</p>}
                {!loadingFiles && !fileError && files.length === 0 && <p className="text-sm text-slate-500">Chưa có tài liệu đính kèm.</p>}
                {files.map(file => (
                <div key={file.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    📄 {fileName(file)}
                  </span>
                  <Button variant="ghost" size="sm" disabled={!!downloading} onClick={() => downloadFile(file)}>
                    {downloading === file.id ? "Đang tải..." : `Tải về (${Math.ceil(file.bytes / 1024)} KB)`}
                  </Button>
                </div>
                ))}
              </div>
            </div>
        </div>
      )}
    </Modal>
  );
}
