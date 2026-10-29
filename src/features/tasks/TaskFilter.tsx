"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faMagnifyingGlass, faStore } from "@fortawesome/free-solid-svg-icons";
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
  managerBranch?: string;
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
  managerBranch,
  statusCounts,
}: TaskFilterBarProps) {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    if (!isManager) {
      apiGet<Branch[]>("/api/branches").then((d) => setBranches(d || [])).catch(() => {});
    }
  }, [isManager]);

  const tabs: { key: TaskStatus | "all"; label: string; count: number; colorClass: string }[] = [
    { key: "all", label: "Tất cả", count: statusCounts.all, colorClass: "bg-gray-100 text-gray-700" },
    { key: "pending", label: "Cần làm", count: statusCounts.pending, colorClass: "bg-blue-50 text-blue-700" },
    { key: "inProgress", label: "Đang làm", count: statusCounts.inProgress, colorClass: "bg-amber-50 text-amber-700" },
    { key: "overdue", label: "Quá giờ", count: statusCounts.overdue, colorClass: "bg-red-50 text-red-700" },
    { key: "completed", label: "Đã xong", count: statusCounts.completed, colorClass: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 mb-6 space-y-4">
      {/* Hàng 1: Status Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onStatusTabChange(tab.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : tab.colorClass
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        {isManager && managerBranch && (
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700">
            <FontAwesomeIcon icon={faStore} fontSize={14} className="text-primary" />
            <span>Chi nhánh: <strong className="text-gray-900">{managerBranch.toUpperCase()}</strong></span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary border border-primary-200 ml-1">Cố định</span>
          </div>
        )}
      </div>

      {/* Hàng 2: Search & Filter nguồn + Chi nhánh (Admin) */}
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

        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          {!isManager && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium whitespace-nowrap">
                <FontAwesomeIcon icon={faStore} fontSize={15} />
                <span>Chi nhánh:</span>
              </div>
              <select
                value={branchFilter}
                onChange={(e) => onBranchFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                    {b.slug.toUpperCase()} ({b.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium whitespace-nowrap">
              <FontAwesomeIcon icon={faFilter} fontSize={15} />
              <span>Nguồn việc:</span>
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => onSourceFilterChange(e.target.value as TaskSourceType | "all")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-primary"
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
