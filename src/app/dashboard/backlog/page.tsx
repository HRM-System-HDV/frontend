"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClockRotateLeft,
  faMagnifyingGlass,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { fetchBacklogs, type BacklogItem } from "@/lib/backlog";
import { GatewayError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

const ALL = "all";

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof GatewayError ? e.message : fallback;

export default function BacklogPage() {
  const { role } = useCurrentUser();
  // Nhật ký thao tác hệ thống: gateway chặn GET /api/backlog cho admin.
  const isAdmin = role === "admin";

  const [logs, setLogs] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Lưu trạng thái thao tác/bộ lọc vào localStorage
  const [searchQuery, setSearchQuery] = useLocalStorageState<string>("hrm_backlog_search", "");
  const [actionFilter, setActionFilter] = useLocalStorageState<string>("hrm_backlog_action_filter", ALL);
  const [moduleFilter, setModuleFilter] = useLocalStorageState<string>("hrm_backlog_module_filter", ALL);

  const refetch = () => setReloadToken((token) => token + 1);

  // Bộ lọc không nằm trong deps: `listBacklog` của integration-service bỏ mọi
  // query params và trả nguyên bảng, nên chỉ tải một lần rồi lọc ở đây
  // (xem frontend/src/lib/backlog.ts).
  useEffect(() => {
    // Không tải nhật ký khi vai trò khác mở thẳng URL: trang đã chặn bằng
    // NoAccessNotice nên trạng thái tải/empty mặc định là đủ.
    if (!isAdmin) return undefined;
    let ignore = false;
    fetchBacklogs()
      .then((data) => {
        if (ignore) return;
        setLogs(data);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        if (ignore) return;
        setError(errorMessage(e, "Không thể tải nhật ký thao tác"));
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [isAdmin, reloadToken]);

  const { actionOptions, moduleOptions } = useMemo(() => {
    const actions = new Set<string>();
    const modules = new Set<string>();
    logs.forEach((log) => {
      if (log.action) actions.add(log.action);
      if (log.module) modules.add(log.module);
    });
    return {
      actionOptions: Array.from(actions).sort(),
      moduleOptions: Array.from(modules).sort(),
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== ALL && log.action !== actionFilter) return false;
      if (moduleFilter !== ALL && log.module !== moduleFilter) return false;
      if (!query) return true;
      return [log.userName, log.targetName, log.action, log.module]
        .some((field) => (field || "").toLowerCase().includes(query));
    });
  }, [logs, actionFilter, moduleFilter, searchQuery]);

  if (!canAccessPath(role, "/dashboard/backlog")) {
    return <NoAccessNotice />;
  }

  return (
    <div className="space-y-4">
      {/* Tiêu đề trang */}
      <PageHeader
        breadcrumb={[{ label: "Hệ thống", href: "#" }, { label: "Lịch sử thao tác" }]}
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="white" onClick={refetch} className="px-3 py-1.5 text-xs whitespace-nowrap">
            Thử lại
          </Button>
        </div>
      )}

      {/* Thanh lọc & tìm kiếm */}
      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-0 max-w-sm">
            <input
              type="text"
              aria-label="Tìm trong nhật ký thao tác"
              placeholder="Tìm theo người, đối tượng, phân hệ..."
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
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-gray-500">Phân hệ:</span>
            <select
              aria-label="Lọc theo phân hệ"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="min-w-0 max-w-full text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value={ALL}>Tất cả phân hệ</option>
              {moduleOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Thao tác */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-gray-500">Thao tác:</span>
            <select
              aria-label="Lọc theo thao tác"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="min-w-0 max-w-full text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value={ALL}>Tất cả thao tác</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
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
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <FontAwesomeIcon icon={faClockRotateLeft} fontSize={20} />
            </div>
            <h6 className="font-semibold text-gray-800 text-sm">
              {logs.length === 0 ? "Nhật ký chưa có mục nào" : "Không có bản ghi khớp bộ lọc"}
            </h6>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Mỗi service ghi nhật ký khi có thao tác nghiệp vụ; hiện work-service ghi
              mỗi lần cập nhật giờ chấm công.
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
                {filteredLogs.map((item) => {
                  const initialLetter = (item.userName || "U").charAt(0).toUpperCase();
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Thời gian: cột `created_at` của Backlog, không có cột timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-600 font-mono text-[11px]">
                          <FontAwesomeIcon icon={faClock} fontSize={12} className="text-gray-400" />
                          <span>{formatDateTime(item.createdAt) || "—"}</span>
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
                            {/* userRole nullable trong schema: thiếu thì để trống, không gán "Nhân viên". */}
                            <span className="text-[10px] text-gray-400 capitalize">{item.userRole || "—"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Thao tác: mã hành động nguyên bản do service ghi */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-gray-800">{item.action}</span>
                      </td>

                      {/* Phân hệ: giá trị `module` nguyên bản từ Backlog */}
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

                      {/* Chi tiết: `description` không có trong model Backlog nên
                          dữ liệu hiện tại luôn hiển thị "—". */}
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
