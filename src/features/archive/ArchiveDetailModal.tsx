"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { getArchived, restoreArchived } from "./archiveApi";
import { formatDate } from "@/lib/utils";
import { requestStatusLabel, requestTypeLabel } from "./ArchiveTable";
import {
  ARCHIVE_TYPE_LABELS,
  formatDateTime,
  type ArchiveType,
  type ArchivedNotification,
  type ArchivedRecord,
  type ArchivedRequest,
  type ArchivedTask,
} from "./types";

interface ArchiveDetailModalProps {
  open: boolean;
  onClose: () => void;
  type?: ArchiveType;
  record: ArchivedRecord | null;
  onRestored: () => void;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}

function AttachmentImage({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="max-h-72 w-full object-contain" />
    </div>
  );
}

export default function ArchiveDetailModal({
  open,
  onClose,
  type,
  record,
  onRestored,
}: ArchiveDetailModalProps) {
  const [detail, setDetail] = useState<ArchivedRecord | null>(record);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [error, setError] = useState("");

  const resolvedType: ArchiveType =
    (record?.archiveType as ArchiveType) ||
    type ||
    (record && "dueDate" in record
      ? "task"
      : record && "targetEmployeeId" in record && !("employeeId" in record)
        ? "notification"
        : "request");

  useEffect(() => {
    if (!open || !record) return;
    let cancelled = false;
    getArchived(resolvedType, record.id)
      .then((fresh) => {
        if (!cancelled) setDetail({ ...fresh, archiveType: resolvedType });
      })
      .catch(() => {
        /* giữ dữ liệu từ danh sách nếu tải chi tiết lỗi */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, record, resolvedType]);

  if (!record) return null;
  const current = detail || record;

  const handleRestore = async () => {
    try {
      setRestoring(true);
      setError("");
      await restoreArchived(resolvedType, current.id);
      onRestored();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể khôi phục bản ghi");
      setConfirmRestore(false);
    } finally {
      setRestoring(false);
    }
  };

  const renderBody = () => {
    if (resolvedType === "task") {
      const task = current as ArchivedTask;
      return (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Người thực hiện" value={task.assignedToName || task.assignedTo} />
            <Field label="Người giao" value={task.assignedByName} />
            <Field label="Chi nhánh" value={task.branchSlug} />
            <Field label="Ca làm việc" value={task.shiftName} />
            <Field label="Hạn hoàn thành" value={task.dueDate ? formatDateTime(task.dueDate) : null} />
            <Field label="Hoàn thành lúc" value={formatDateTime(task.completedAt)} />
            <Field label="Người nộp ảnh" value={task.photoSubmittedBy} />
            <Field label="Nộp ảnh lúc" value={formatDateTime(task.photoSubmittedAt)} />
          </dl>
          <Field label="Mô tả công việc" value={task.description} />
          {task.proofPhotoUrl && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">
                Ảnh minh chứng kết quả
              </p>
              <AttachmentImage url={task.proofPhotoUrl} alt="Ảnh minh chứng kết quả công việc" />
            </div>
          )}
        </div>
      );
    }
    if (resolvedType === "request") {
      const request = current as ArchivedRequest;
      const status = requestStatusLabel(request.status);
      return (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Loại yêu cầu" value={requestTypeLabel(request.type)} />
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Trạng thái</dt>
              <dd className="mt-0.5">
                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${status.className}`}>
                  {status.text}
                </span>
              </dd>
            </div>
            <Field label="Nhân viên gửi" value={request.employeeId} />
            <Field label="Chi nhánh" value={request.branchSlug} />
            <Field label="Người duyệt" value={request.reviewedBy} />
            <Field label="Nhân viên liên quan" value={request.targetEmployeeId} />
          </dl>
          <Field label="Nội dung" value={request.content} />
          <Field label="Ghi chú duyệt" value={request.reviewNote} />
          {request.attachmentUrl && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">
                File đính kèm
              </p>
              <AttachmentImage url={request.attachmentUrl} alt="File đính kèm yêu cầu" />
            </div>
          )}
        </div>
      );
    }
    const notification = current as ArchivedNotification;
    return (
      <div className="space-y-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Người gửi" value={notification.senderName || "Hệ thống"} />
          <Field label="Vai trò người gửi" value={notification.senderRole} />
          <Field label="Đối tượng nhận" value={notification.targetEmployeeId || "Toàn hệ thống"} />
          <Field label="Chi nhánh" value={notification.branchSlug} />
          {notification.shiftName && <Field label="Ca làm việc" value={notification.shiftName} />}
          {notification.shiftDate && <Field label="Ngày ca" value={formatDate(notification.shiftDate)} />}
        </dl>
        <Field label="Nội dung thông báo" value={notification.body} />
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Chi tiết lưu trữ — ${ARCHIVE_TYPE_LABELS[resolvedType] || "Bản ghi"}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-[11px] text-gray-400">
            Lưu trữ lúc {formatDateTime(current.archivedAt)}
          </span>
          <div className="flex gap-2">
            <Button variant="white" onClick={onClose}>Đóng</Button>
            {confirmRestore ? (
              <>
                <Button variant="white" onClick={() => setConfirmRestore(false)} disabled={restoring}>
                  Hủy
                </Button>
                <Button variant="success" onClick={handleRestore} disabled={restoring}>
                  {restoring ? "Đang khôi phục..." : "Xác nhận khôi phục"}
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setConfirmRestore(true)} disabled={loading}>
                <FontAwesomeIcon icon={faRotateLeft} fontSize={14} />
                Khôi phục
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="font-semibold text-gray-900 text-sm">{current.title}</h4>
          <p className="text-[11px] text-gray-500 mt-1">
            Tạo lúc {formatDateTime(current.createdAt)} · Mã bản ghi: {current.id}
          </p>
        </div>
        {confirmRestore && (
          <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Khôi phục sẽ đưa bản ghi này trở lại danh sách làm việc. Xác nhận?
          </p>
        )}
        {error && (
          <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {renderBody()}
      </div>
    </Modal>
  );
}