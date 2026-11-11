"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxArchive } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ArchiveRunPanel from "./ArchiveRunPanel";
import ArchiveTable from "./ArchiveTable";
import ArchiveDetailModal from "./ArchiveDetailModal";
import { runAll, type RunProgress } from "./archiveApi";
import { formatDate } from "@/lib/utils";
import {
  type ArchiveCounts,
  type ArchiveFilterType,
  type ArchiveSelection,
  type ArchivedRecord,
} from "./types";

export default function ArchiveHub() {
  const [filterType, setFilterType] = useState<ArchiveFilterType>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [detail, setDetail] = useState<ArchivedRecord | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const [months, setMonths] = useState<number | "custom">(12);
  const [customDate, setCustomDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [error, setError] = useState("");

  // customDate là giá trị ISO của <input type="date">; backend nhận cutoffDate DD/MM/YYYY.
  const selection: ArchiveSelection =
    months === "custom" ? { cutoffDate: formatDate(customDate) } : { months };
  const selectionValid = months !== "custom" || Boolean(customDate);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRun = async () => {
    setConfirmOpen(false);
    try {
      setRunning(true);
      setError("");
      setProgress({ moved: {}, remaining: {} });
      const moved: ArchiveCounts = await runAll(selection, (p) => setProgress(p));
      setProgress(null);
      const total = Object.values(moved).reduce((acc, n) => acc + (n || 0), 0);
      showToast(`Đã lưu trữ ${total} bản ghi vào kho lưu trữ`);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thực hiện lưu trữ thất bại");
    } finally {
      setRunning(false);
    }
  };

  const handleRestored = () => {
    showToast("Đã khôi phục bản ghi về danh sách hoạt động");
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold ${
            toast.tone === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      <PageHeader
        title="Lưu trữ"
        breadcrumb={[{ label: "Hệ thống", href: "#" }, { label: "Lưu trữ" }]}
        actions={
          <Button
            variant="primary"
            onClick={() => setConfirmOpen(true)}
            disabled={!selectionValid || running}
          >
            <FontAwesomeIcon icon={faBoxArchive} fontSize={14} />
            {running ? "Đang lưu trữ..." : "Thực hiện lưu trữ"}
          </Button>
        }
      />

      <ArchiveRunPanel
        running={running}
        progress={progress}
        error={error}
      />

      <ArchiveTable
        key={filterType}
        type={filterType}
        onTypeChange={setFilterType}
        refreshKey={refreshKey}
        onOpen={setDetail}
        months={months}
        customDate={customDate}
        running={running}
        onMonthsChange={setMonths}
        onCustomDateChange={setCustomDate}
      />

      <ArchiveDetailModal
        key={detail?.id ?? "none"}
        open={detail !== null}
        onClose={() => setDetail(null)}
        record={detail}
        onRestored={handleRestored}
      />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Xác nhận lưu trữ dữ liệu"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="white" onClick={() => setConfirmOpen(false)}>Hủy bỏ</Button>
            <Button variant="primary" onClick={handleRun}>Xác nhận lưu trữ</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-700">
          Chuyển các bản ghi cũ ({months === "custom" ? `tạo trước ${formatDate(customDate)}` : `cũ hơn ${months} tháng`}) vào kho lưu trữ?
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Dữ liệu sau khi lưu trữ sẽ không còn xuất hiện trong danh sách hoạt động, nhưng vẫn xem lại
          và khôi phục được tại trang này.
        </p>
      </Modal>
    </div>
  );
}
