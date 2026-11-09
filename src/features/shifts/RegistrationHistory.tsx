"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarWeek } from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Table, { Column } from "@/components/ui/Table";
import type { ShiftRegistrationRecord, WeeklyRegistration } from "./types";
import type { Branch } from "@/types";

interface Props {
  registrationRecords?: ShiftRegistrationRecord[];
  weeklyRegistrations?: WeeklyRegistration[];
  branches?: Branch[];
  onDelete?: (id: string) => void;
  onAssignFromRegistration?: (record: ShiftRegistrationRecord) => void;
}

export default function RegistrationHistorySection({
  weeklyRegistrations = [],
}: Props) {
  const weeklyColumns: Column<WeeklyRegistration>[] = [
    {
      key: "employeeName",
      header: "NHÂN SỰ ĐĂNG KÝ",
      render: (r) => (
        <div>
          <span className="font-semibold text-gray-800">{r.employeeName}</span>
          <span className="block text-xs text-gray-400">{r.role}</span>
        </div>
      ),
    },
    {
      key: "requestedCount",
      header: "SỐ CA ĐĂNG KÝ",
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

        <div className="flex items-center gap-2">
          {/* Chỉ giữ nút/badge Theo tuần */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold bg-white text-primary shadow-xs">
              <FontAwesomeIcon icon={faCalendarWeek} fontSize={12} />
              Theo tuần
            </span>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <Table
          columns={weeklyColumns}
          data={weeklyRegistrations}
          rowKey={(r) => r.id}
          emptyMessage="Chưa có lịch đăng ký ca tuần của nhân viên"
        />
      </CardBody>
    </Card>
  );
}
