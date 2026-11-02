"use client";

import { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStore, faCalendarDays, faListUl, faCalendarWeek } from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { Input, Select } from "@/components/ui/Form";
import type { ShiftRegistrationRecord, WeeklyRegistration } from "./types";
import type { Branch } from "@/types";

interface Props {
  registrationRecords: ShiftRegistrationRecord[];
  weeklyRegistrations?: WeeklyRegistration[];
  branches?: Branch[];
  onDelete?: (id: string) => void;
  onAssignFromRegistration?: (record: ShiftRegistrationRecord) => void;
}

export default function RegistrationHistorySection({
  registrationRecords,
  weeklyRegistrations = [],
  branches = [],
  onDelete,
  onAssignFromRegistration,
}: Props) {
  const [viewMode, setViewMode] = useState<"detail" | "weekly">("detail");
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const filteredRecords = useMemo(() => {
    return registrationRecords.filter((r) => {
      if (
        branchFilter !== "all" &&
        r.branch.toLowerCase().replace("-", "") !== branchFilter.toLowerCase().replace("-", "")
      ) {
        return false;
      }
      if (dateFilter) {
        const [y, m, d] = dateFilter.split("-");
        const formatted = `${d}/${m}/${y}`;
        const shortFormat = `${d}/${m}`;
        if (r.date !== formatted && !r.date.includes(formatted) && !r.date.includes(shortFormat)) {
          return false;
        }
      }
      return true;
    });
  }, [registrationRecords, branchFilter, dateFilter]);

  const filteredWeekly = useMemo(() => {
    if (branchFilter === "all") return weeklyRegistrations;
    return weeklyRegistrations.filter(
      (r) => r.branch.toLowerCase().replace("-", "") === branchFilter.toLowerCase().replace("-", "")
    );
  }, [weeklyRegistrations, branchFilter]);

  const detailColumns: Column<ShiftRegistrationRecord>[] = [
    {
      key: "employeeName",
      header: "NHÂN VIÊN",
      render: (r) => (
        <div>
          <span className="font-semibold text-gray-800">{r.employeeName}</span>
          <span className="block text-xs text-gray-400">{r.role} • Mã: {r.employeeId}</span>
        </div>
      ),
    },
    {
      key: "branch",
      header: "CHI NHÁNH",
      render: (r) => <Badge tone="gray">{r.branch}</Badge>,
    },
    {
      key: "date",
      header: "NGÀY ĐĂNG KÝ",
      render: (r) => <span className="font-semibold text-gray-700">{r.date}</span>,
    },
    {
      key: "templateName",
      header: "KHUNG CA",
      render: (r) => <Badge tone="primary">{r.templateName}</Badge>,
    },
    {
      key: "scheduled",
      header: "GIỜ LÀM",
      render: (r) => <span className="font-medium text-gray-700">{r.scheduled}</span>,
    },
    {
      key: "registeredAt",
      header: "THỜI GIAN GỬI",
      render: (r) => <span className="text-xs text-gray-500 font-mono">{r.registeredAt}</span>,
    },
    {
      key: "status",
      header: "TRẠNG THÁI",
      render: () => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Đã đăng ký
        </span>
      ),
    },
  ];

  const weeklyColumns: Column<WeeklyRegistration>[] = [
    {
      key: "employeeName",
      header: "NHÂN SỰ ĐĂNG KÝ",
      render: (r) => (
        <div>
          <span className="font-semibold text-gray-800">{r.employeeName}</span>
          <span className="block text-xs text-gray-400">{r.role} • Chi nhánh {r.branch}</span>
          {r.note && (
            <span className="block text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 border border-amber-200">
              Ghi chú: {r.note}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "requestedCount",
      header: "SỐ CA NGUYỆN VỌNG",
      render: (r) => (
        <span className="font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-xs">
          {r.requestedCount} ca / tuần
        </span>
      ),
    },
    {
      key: "schedule",
      header: "LỊCH ĐĂNG KÝ CHI TIẾT (THỨ 2 - CN)",
      render: (r) => (
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(r.days).map(([day, shift]) => {
            const isOff = shift === "Nghỉ" || shift === "off";
            return (
              <div
                key={day}
                className={`text-[11px] text-center px-2 py-1 rounded-md border min-w-[42px] ${
                  isOff
                    ? "bg-gray-50 text-gray-400 border-gray-200"
                    : "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
                }`}
              >
                <div className="font-bold">{day}</div>
                <div className="text-[10px] truncate max-w-[65px]">{isOff ? "OFF" : shift.replace("Ca ", "")}</div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      key: "registeredAt",
      header: "THỜI GIAN ĐĂNG KÝ",
      render: (r) => <span className="text-xs text-gray-500 font-mono">{r.registeredAt}</span>,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle>Lịch sử đăng ký ca</CardTitle>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút chuyển đổi giao diện: Chi tiết theo dòng vs Tổng hợp theo tuần */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("detail")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                viewMode === "detail"
                  ? "bg-white text-primary shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <FontAwesomeIcon icon={faListUl} fontSize={12} />
              Chi tiết
            </button>
            <button
              type="button"
              onClick={() => setViewMode("weekly")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                viewMode === "weekly"
                  ? "bg-white text-primary shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <FontAwesomeIcon icon={faCalendarWeek} fontSize={12} />
              Theo tuần
            </button>
          </div>

          {/* Bộ lọc chi nhánh */}
          <div className="w-36">
            <Select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="all">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.slug || b.id} value={b.slug.toUpperCase()}>
                  {b.slug.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>

          {/* Bộ lọc ngày */}
          {viewMode === "detail" && (
            <div className="w-36">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs py-1.5"
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardBody>
        {viewMode === "detail" ? (
          <Table
            columns={detailColumns}
            data={filteredRecords}
            rowKey={(r) => r.id}
            emptyMessage="Chưa có nhân viên nào gửi đăng ký ca làm việc"
          />
        ) : (
          <Table
            columns={weeklyColumns}
            data={filteredWeekly}
            rowKey={(r) => r.id}
            emptyMessage="Chưa có lịch đăng ký ca tuần của nhân viên"
          />
        )}
      </CardBody>
    </Card>
  );
}
