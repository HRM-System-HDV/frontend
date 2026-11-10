"use client";

import { type RunProgress } from "./archiveApi";
import {
  ARCHIVE_TYPE_LABELS,
  formatDateTime,
  type ArchivePreview,
  type ArchiveType,
} from "./types";

interface ArchiveRunPanelProps {
  months: number | "custom";
  customDate: string;
  running: boolean;
  preview: ArchivePreview | null;
  progress: RunProgress | null;
  error: string;
  onMonthsChange: (value: number | "custom") => void;
  onCustomDateChange: (value: string) => void;
}

const MONTH_OPTIONS = [6, 12, 24];

export default function ArchiveRunPanel({
  preview,
  progress,
  error,
  running,
}: Pick<ArchiveRunPanelProps, "preview" | "progress" | "error" | "running">) {
  const totalPreview = preview
    ? Object.values(preview.counts).reduce((acc, n) => acc + (n || 0), 0)
    : 0;
  const movedSoFar = progress
    ? Object.values(progress.moved).reduce((acc, n) => acc + (n || 0), 0)
    : 0;

  if (!preview && !running && !error) return null;

  return (
    <div className="space-y-3">
      {preview && !running && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-xs">
          <p className="font-semibold text-gray-700 mb-1.5">
            Sẽ lưu trữ bản ghi tạo trước {formatDateTime(preview.cutoffDate)}:
          </p>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(ARCHIVE_TYPE_LABELS) as ArchiveType[]).map((type) => (
              <span key={type} className="text-gray-600">
                {ARCHIVE_TYPE_LABELS[type]}:{" "}
                <strong className="text-gray-900">{preview.counts[type] || 0}</strong>
              </span>
            ))}
          </div>
          {totalPreview === 0 && (
            <p className="text-gray-400 mt-1.5">Không có dữ liệu nào đủ điều kiện lưu trữ ở mốc này.</p>
          )}
        </div>
      )}

      {running && progress && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-gray-700">
          Đang chuyển dữ liệu theo từng đợt, vui lòng không đóng trang... Đã chuyển{" "}
          <strong>{movedSoFar}</strong> bản ghi.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}