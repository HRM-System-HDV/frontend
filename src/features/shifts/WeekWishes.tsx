"use client";

import Table, { Column } from "@/components/ui/Table";
import type { WeeklyRegistration } from "@/features/shifts/types";

interface Props {
  registrations: WeeklyRegistration[];
  onAssignFromRegistration?: (registration: WeeklyRegistration) => void;
}

export default function WeeklyRegistrationSection({ registrations, onAssignFromRegistration }: Props) {
  const columns: Column<WeeklyRegistration>[] = [
    {
      key: "employeeName",
      header: "Nhân sự đăng ký",
      render: (r) => (
        <div>
          <span className="font-semibold text-gray-800">{r.employeeName}</span>
          <span className="block text-xs text-gray-400">{r.role} • Chi nhánh {r.branch}</span>
        </div>
      ),
    },

    {
      key: "requestedCount",
      header: "Số ca nguyện vọng",
      render: (r) => <span className="font-bold text-blue-600">{r.requestedCount} ca / tuần</span>,
    },
    {
      key: "schedule",
      header: "Lịch đăng ký chi tiết (Thứ 2 - CN)",
      render: (r) => (
        <div>
          <div className="flex gap-1">
            {Object.entries(r.days).map(([day, shift]) => {
              const isOff = shift === "Nghỉ";
              return (
                <div
                  key={day}
                  className={`text-[10px] text-center px-1.5 py-1 rounded border ${
                    isOff ? "bg-gray-50 text-gray-400 border-gray-200" : "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
                  }`}
                >
                  <div className="font-bold">{day}</div>
                  <div>{isOff ? "OFF" : shift.replace("Ca ", "")}</div>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    ...(onAssignFromRegistration
      ? [
          {
            key: "action" as const,
            header: "Thao tác",
            render: (r: WeeklyRegistration) => (
              <button
                type="button"
                onClick={() => onAssignFromRegistration(r)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                + Xếp ca
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="pt-1">
      <Table columns={columns} data={registrations} rowKey={(r) => r.id} emptyMessage="Chưa có nhân viên nào gửi đăng ký ca" />
    </div>
  );
}
