"use client";

import { type RunProgress } from "./archiveApi";

interface ArchiveRunPanelProps {
  running: boolean;
  progress: RunProgress | null;
  error: string;
}

export default function ArchiveRunPanel({
  progress,
  error,
  running,
}: ArchiveRunPanelProps) {
  const movedSoFar = progress
    ? Object.values(progress.moved).reduce((acc, n) => acc + (n || 0), 0)
    : 0;

  if (!running && !error) return null;

  return (
    <div className="space-y-3">
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
