"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClockRotateLeft,
  faMagnifyingGlass,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { fetchBacklogs, type BacklogItem } from "@/lib/backlog";

export default function BacklogPage() {
  const [logs, setLogs] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // Lưu trạng thái thao tác/bộ lọc vào localStorage
  const [searchQuery, setSearchQuery] = useLocalStorageState<string>("hrm_backlog_search", "");
  const [actionFilter, setActionFilter] = useLocalStorageState<string>("hrm_backlog_action_filter", "all");
  const [moduleFilter, setModuleFilter] = useLocalStorageState<string>("hrm_backlog_module_filter", "all");

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let ignore = false;
    fetchBacklogs({
      action: actionFilter,
      module: moduleFilter,
      search: searchQuery,
    })
      .then((data) => {
        if (!ignore) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          showToast("Không thể tải nhật ký thao tác", "danger");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [actionFilter, moduleFilter, searchQuery]);

  // Danh sách các phân hệ duy nhất để lọc
  const moduleOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.module) set.add(l.module);
    });
    // Thêm các phân hệ phổ biến nếu chưa có
    [
      "Nhân sự",
      "Phân ca làm việc",
      "Khung ca mẫu",
      "Đăng ký ca",
      "Giao việc & Nhiệm vụ",
      "Phê duyệt yêu cầu",
      "Phiếu lương",
      "Chi nhánh",
      "Phòng ban",
      "Bảng tin",
      "Nội quy & Quy định",
      "Cấu hình Wi-Fi",
      "Cấu hình chấm công",
    ].forEach((m) => set.add(m));
    return Array.from(set);
  }, [logs]);

  return (
    <div className="space-y-4">
      {/* Toast thông báo */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
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

      {/* Tiêu đề trang */}
      <PageHeader
        breadcrumb={[{ label: "Hệ thống", href: "#" }, { label: "Lịch sử thao tác" }]}
      />

      {/* Thanh lọc & tìm kiếm */}
      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Tìm theo người, đối tượng, mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium border border-gray-200 rounded-lg pl-8 pr-3 py-2 bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lọc Phân hệ */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Phân hệ:</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">Tất cả phân hệ</option>
              {moduleOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Thao tác */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Thao tác:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">Tất cả thao tác</option>
              <option value="CREATE">Thêm mới</option>
              <option value="UPDATE">Chỉnh sửa</option>
              <option value="DELETE">Xóa</option>
              <option value="APPROVE">Phê duyệt</option>
              <option value="REJECT">Từ chối</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bảng danh sách nhật ký thao tác */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-100/80 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <FontAwesomeIcon icon={faClockRotateLeft} fontSize={20} />
            </div>
            <h6 className="font-semibold text-gray-800 text-sm">Chưa có thao tác nào trong nhật ký</h6>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Mọi hành động thêm mới, chỉnh sửa, xóa đối tượng trên hệ thống sẽ tự động được ghi nhận tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Thao tác</th>
                  <th className="py-3 px-4">Phân hệ</th>
                  <th className="py-3 px-4">Đối tượng tác động</th>
                  <th className="py-3 px-4">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {logs.map((item) => {
                  const initialLetter = (item.userName || "U").charAt(0).toUpperCase();
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Thời gian */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-600 font-mono text-[11px]">
                          <FontAwesomeIcon icon={faClock} fontSize={12} className="text-gray-400" />
                          <span>{item.timestamp}</span>
                        </div>
                      </td>

                      {/* Người thực hiện */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                            {initialLetter}
                          </span>
                          <div>
                            <span className="font-semibold text-gray-900 block">{item.userName}</span>
                            <span className="text-[10px] text-gray-400 capitalize">{item.userRole || "Nhân viên"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-gray-800">
                          {item.actionLabel || item.action}
                        </span>
                      </td>

                      {/* Phân hệ */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-xs border border-gray-200">
                          {item.module}
                        </span>
                      </td>

                      {/* Đối tượng tác động */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-800 block max-w-xs truncate" title={item.targetName}>
                          {item.targetName}
                        </span>
                      </td>

                      {/* Chi tiết */}
                      <td className="py-3 px-4">
                        <span className="text-gray-500 block max-w-md truncate" title={item.description}>
                          {item.description || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

