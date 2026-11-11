"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faListCheck, faMagnifyingGlass, faStore } from "@fortawesome/free-solid-svg-icons";
import { apiGet } from "@/lib/api";
import type { Branch } from "@/types";
import type { TaskSourceType, TaskStatus } from "./types";

interface TaskFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusTab: TaskStatus | "all";
  onStatusTabChange: (status: TaskStatus | "all") => void;
  sourceFilter: TaskSourceType | "all";
  onSourceFilterChange: (source: TaskSourceType | "all") => void;
  branchFilter: string;
  onBranchFilterChange: (branch: string) => void;
  isManager?: boolean;
  statusCounts: {
    all: number;
    pending: number;
    inProgress: number;
    overdue: number;
    completed: number;
  };
}

export default function TaskFilterBar({
  searchQuery,
  onSearchChange,
  statusTab,
  onStatusTabChange,
  sourceFilter,
  onSourceFilterChange,
  branchFilter,
  onBranchFilterChange,
  isManager = false,
  statusCounts,
}: TaskFilterBarProps) {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    // Chỉ admin mới còn select chi nhánh nên vai trò bị ghim khỏi gọi API.
    if (isManager) return;
    apiGet<Branch[]>("/api/branches").then((d) => setBranches(d || [])).catch(() => {});
  }, [isManager]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 mb-6">
      {/* Tìm kiếm & bộ lọc: trạng thái, chi nhánh, nguồn việc */}
      <div className="flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <FontAwesomeIcon icon={faMagnifyingGlass} fontSize={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tên công việc, nhân sự thực hiện, người giao..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto min-w-0 flex-wrap">
          {/* Bộ lọc trạng thái (gộp từ 5 tab Tất cả/Cần làm/Đang làm/Quá giờ/Đã xong) */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium whitespace-nowrap">
              <FontAwesomeIcon icon={faListCheck} fontSize={15} />
            </div>
            <select
              value={statusTab}
              onChange={(e) => onStatusTabChange(e.target.value as TaskStatus | "all")}
              className="min-w-0 max-w-full px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="all">Tất cả trạng thái ({statusCounts.all})</option>
              <option value="pending">Cần làm ({statusCounts.pending})</option>
              <option value="inProgress">Đang làm ({statusCounts.inProgress})</option>
              <option value="overdue">Quá giờ ({statusCounts.overdue})</option>
              <option value="completed">Đã xong ({statusCounts.completed})</option>
            </select>
          </div>

          {!isManager && (
            /* Vai trò bị ghim chi nhánh không còn bộ lọc; tên chi nhánh ở footer sidebar. */
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium whitespace-nowrap">
                <FontAwesomeIcon icon={faStore} fontSize={15} />
              </div>
              <select
                value={branchFilter}
                onChange={(e) => onBranchFilterChange(e.target.value)}
                className="min-w-0 max-w-full px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                    {b.name} ({b.slug.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium whitespace-nowrap">
              <FontAwesomeIcon icon={faFilter} fontSize={15} />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => onSourceFilterChange(e.target.value as TaskSourceType | "all")}
              className="min-w-0 max-w-full px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="all">Toàn bộ nguồn việc</option>
              <option value="manager">Quản lý giao riêng</option>
              <option value="shift">Cố định theo ca</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
