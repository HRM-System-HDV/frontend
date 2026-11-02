"use client";

import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarWeek, faStore } from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import type { WeeklyRegistration } from "@/features/shifts/types";

interface Props {
  registrations: WeeklyRegistration[];
  onAssignFromRegistration?: (registration: WeeklyRegistration) => void;
}

export default function WeeklyRegistrationSection({ registrations, onAssignFromRegistration }: Props) {
  const [branchFilter, setBranchFilter] = useState("all");

  const filteredRegistrations = useMemo(() => {
    if (branchFilter === "all") return registrations;
    return registrations.filter(
      (r) => r.branch.toLowerCase().replace("-", "") === branchFilter.toLowerCase().replace("-", "")
    );
  }, [registrations, branchFilter]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    for (const r of registrations) {
      if (r.branch && r.branch !== "—") set.add(r.branch.toUpperCase());
    }
    return Array.from(set);
  }, [registrations]);

  const columns: Column<WeeklyRegistration>[] = [
    {
      key: "employeeName",
      header: "Nhân sự đăng ký",
      render: (r) => (
        <div>
          <span className="font-semibold text-gray-800">{r.employeeName}</span>
          <span className="block text-xs text-gray-400">
            {r.role} • Chi nhánh {r.branch}
          </span>
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
      header: "Số ca nguyện vọng",
      render: (r) => (
        <span className="font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-xs">
          {r.requestedCount} ca / tuần
        </span>
      ),
    },
    {
      key: "schedule",
      header: "Lịch đăng ký chi tiết (Thứ 2 - CN)",
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
      header: "Thời gian đăng ký",
      render: (r) => <span className="text-xs text-gray-500">{r.registeredAt}</span>,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle>Bảng tổng hợp đăng ký nguyện vọng ca tuần</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {branches.length > 1 && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs">
              <FontAwesomeIcon icon={faStore} fontSize={13} className="text-primary" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-medium text-gray-800 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    Chi nhánh {b}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Badge tone="primary">
            <FontAwesomeIcon icon={faCalendarWeek} fontSize={13} className="mr-1" />
            {filteredRegistrations.length} nhân sự đăng ký
          </Badge>
        </div>
      </CardHeader>
      <CardBody>
        <Table
          columns={columns}
          data={filteredRegistrations}
          rowKey={(r) => r.id}
          emptyMessage="Chưa có nhân viên nào gửi đăng ký ca làm việc trong tuần này"
        />
      </CardBody>
    </Card>
  );
}
