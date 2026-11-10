"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxArchive, faEye, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";
import { listArchive } from "./archiveApi";
import {
  ARCHIVE_FILTER_LABELS,
  ARCHIVE_TYPE_LABELS,
  formatDateTime,
  type ArchiveFilterType,
  type ArchivePage,
  type ArchiveType,
  type ArchivedNotification,
  type ArchivedRecord,
  type ArchivedRequest,
  type ArchivedTask,
} from "./types";

interface ArchiveTableProps {
  type: ArchiveFilterType;
  onTypeChange: (type: ArchiveFilterType) => void;
  refreshKey: number;
  onOpen: (record: ArchivedRecord) => void;
  months: number | "custom";
  customDate: string;
  running: boolean;
  onMonthsChange: (value: number | "custom") => void;
  onCustomDateChange: (value: string) => void;
}

const PAGE_SIZE = 20;
const MONTH_OPTIONS = [6, 12, 24];
const FILTER_TYPES: ArchiveFilterType[] = ["all", "task", "request", "notification"];

export function requestTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    leave: "Nghỉ phép",
    "nghỉ phép": "Nghỉ phép",
    overtime: "Tăng ca",
    "tăng ca": "Tăng ca",
    advance: "Tạm ứng",
    "tạm ứng": "Tạm ứng",
    shift_swap: "Đổi ca",
    "đổi ca": "Đổi ca",
    work_supplement: "Bổ sung công",
    "bổ sung công": "Bổ sung công",
    other: "Khác",
  };
  return labels[value] || value;
}

export function requestStatusLabel(value: string): { text: string; className: string } {
  if (value === "approved" || value === "đã duyệt") {
    return { text: "Đã duyệt", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (value === "rejected" || value === "từ chối") {
    return { text: "Từ chối", className: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  return { text: value, className: "bg-gray-100 text-gray-600 border-gray-200" };
}

export default function ArchiveTable({
  type,
  onTypeChange,
  refreshKey,
  onOpen,
  months,
  customDate,
  running,
  onMonthsChange,
  onCustomDateChange,
}: ArchiveTableProps) {
  const [data, setData] = useState<ArchivePage | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
    setQuery("");
    setSearchInput("");
  }, [type]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await listArchive(type, { all: true, q: query });
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách lưu trữ");
    } finally {
      setLoading(false);
    }
  }, [type, query]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const allItems = data?.items || [];
  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const pagedItems = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resolveItemType = (record: ArchivedRecord): ArchiveType => {
    if (record.archiveType) return record.archiveType;
    if ("dueDate" in record) return "task";
    if ("targetEmployeeId" in record && !("employeeId" in record)) return "notification";
    return "request";
  };

  const renderRow = (record: ArchivedRecord) => {
    const itemType = resolveItemType(record);
    const common = (
      <>
        {type === "all" && (
          <td className="py-3 px-4 whitespace-nowrap">
            <span
              className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                itemType === "task"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : itemType === "request"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {ARCHIVE_TYPE_LABELS[itemType]}
            </span>
          </td>
        )}
        <td className="py-3 px-4">
          <span className="font-semibold text-gray-800 block max-w-xs truncate" title={record.title}>
            {record.title}
          </span>
        </td>
      </>
    );

    if (itemType === "task") {
      const task = record as ArchivedTask;
      return (
        <>
          {common}
          <td className="py-3 px-4 whitespace-nowrap text-gray-600">{task.assignedToName || task.assignedTo || "—"}</td>
          <td className="py-3 px-4 whitespace-nowrap text-gray-600">{task.branchSlug || "—"}</td>
          <td className="py-3 px-4 whitespace-nowrap text-gray-600">{formatDateTime(task.completedAt)}</td>
        </>
      );
    }
    if (itemType === "request") {
      const request = record as ArchivedRequest;
      const status = requestStatusLabel(request.status);
      return (
        <>
          {common}
          <td className="py-3 px-4 whitespace-nowrap text-gray-600">{requestTypeLabel(request.type)}</td>
          <td className="py-3 px-4 whitespace-nowrap text-gray-600">{request.employeeId}</td>
          <td className="py-3 px-4 whitespace-nowrap">
            <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${status.className}`}>
              {status.text}
            </span>
          </td>
        </>
      );
    }
    const notification = record as ArchivedNotification;
    return (
      <>
        {common}
        <td className="py-3 px-4 whitespace-nowrap text-gray-600">{notification.senderName || "Hệ thống"}</td>
        <td className="py-3 px-4 whitespace-nowrap text-gray-600">
          {notification.targetEmployeeId || "Toàn hệ thống"}
        </td>
        <td className="py-3 px-4 whitespace-nowrap text-gray-600">—</td>
      </>
    );
  };

  const headers =
    type === "all"
      ? ["Loại", "Tiêu đề", "Người thực hiện / Loại", "Chi nhánh / Đối tượng", "Trạng thái / Ngày"]
      : type === "task"
        ? ["Tiêu đề", "Người thực hiện", "Chi nhánh", "Hoàn thành lúc"]
        : type === "request"
          ? ["Tiêu đề", "Loại yêu cầu", "Nhân viên", "Trạng thái"]
          : ["Tiêu đề", "Người gửi", "Đối tượng", "Chi nhánh"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
      <div className="p-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <form
          className="relative flex-1 max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(searchInput.trim());
          }}
        >
          <input
            type="text"
            placeholder="Tìm theo tiêu đề..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full text-xs font-medium border border-gray-200 rounded-lg pl-8 pr-3 py-2 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary"
          />
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
          />
        </form>
        <div className="flex items-center gap-3">
          <select
            value={type}
            disabled={running}
            onChange={(e) => {
              onTypeChange(e.target.value as ArchiveFilterType);
              setPage(1);
            }}
            className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-primary cursor-pointer"
          >
            {FILTER_TYPES.map((t) => (
              <option key={t} value={t}>
                {ARCHIVE_FILTER_LABELS[t]}
              </option>
            ))}
          </select>

          <select
            value={String(months)}
            disabled={running}
            onChange={(e) =>
              onMonthsChange(e.target.value === "custom" ? "custom" : Number(e.target.value))
            }
            className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-primary cursor-pointer"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>Cũ hơn {m} tháng</option>
            ))}
            <option value="custom">Tùy chỉnh ngày...</option>
          </select>

          {months === "custom" && (
            <input
              type="date"
              value={customDate}
              disabled={running}
              onChange={(e) => onCustomDateChange(e.target.value)}
              className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-primary"
            />
          )}

          {data && (
            <span className="text-xs text-gray-500 font-medium">{data.total} bản ghi</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100/80 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm font-semibold text-rose-600">{error}</div>
      ) : !data || data.items.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <FontAwesomeIcon icon={faBoxArchive} fontSize={20} />
          </div>
          <h6 className="font-semibold text-gray-800 text-sm">Chưa có dữ liệu lưu trữ</h6>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Dùng bảng điều khiển phía trên để chuyển dữ liệu cũ vào kho lưu trữ.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  {headers.map((h) => (
                    <th key={h} className="py-3 px-4">{h}</th>
                  ))}
                  <th className="py-3 px-4">Ngày tạo</th>
                  <th className="py-3 px-4">Lưu trữ lúc</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {pagedItems.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    {renderRow(record)}
                    <td className="py-3 px-4 whitespace-nowrap text-gray-500">{formatDateTime(record.createdAt)}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-gray-500">{formatDateTime(record.archivedAt)}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <Button variant="white" size="sm" onClick={() => onOpen(record)}>
                        <FontAwesomeIcon icon={faEye} fontSize={12} />
                        Xem
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Trang {page}/{totalPages}</span>
            <div className="flex gap-2">
              <Button variant="white" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trước
              </Button>
              <Button variant="white" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Sau
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}