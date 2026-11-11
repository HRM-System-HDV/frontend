"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarWeek,
  faSitemap,
  faStore,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { apiGet } from "@/lib/api";
import type { Branch, Department, Employee } from "@/types";
import { useCurrentUser } from "@/context/AuthContext";

export default function DashboardOverviewPage() {
  const { role, branchSlug } = useCurrentUser();
  const isManager = role === "manager";

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftsCount, setShiftsCount] = useState<number>(0);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      apiGet<Branch[]>("/api/branches").catch(() => []),
      apiGet<Department[]>("/api/departments").catch(() => []),
      apiGet<Employee[]>("/api/employees").catch(() => []),
      apiGet<any[]>("/api/shifts").catch(() => []),
    ])
      .then(([bData, dData, eData, sData]) => {
        if (!ignore) {
          setBranches(Array.isArray(bData) ? bData : []);
          setDepartments(Array.isArray(dData) ? dData : []);
          setEmployees(Array.isArray(eData) ? eData : []);
          setShiftsCount(Array.isArray(sData) ? sData.length : 0);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  // Filter if manager
  const displayedEmployees = isManager
    ? employees.filter(
        (e) => (e.branch || "").toLowerCase().replace(/-/g, "") === branchSlug.toLowerCase().replace(/-/g, "")
      )
    : employees;

  const totalEmployees = displayedEmployees.length;
  const activeEmployees = displayedEmployees.filter((e) => e.status !== "vô hiệu hóa").length;
  const activeBranches = branches.filter((b) => b.status === "hoạt động").length;
  const activeDepartments = departments.filter((d) => d.status === "hoạt động").length;

  // Recent 5 employees
  const recentEmployees = [...displayedEmployees].slice(0, 5);

  const employeeColumns: Column<Employee>[] = [
    {
      key: "name",
      header: "Nhân viên",
      render: (e) => (
        <div>
          <div className="font-semibold text-gray-800">{e.name}</div>
          <div className="text-xs text-gray-400">{e.email}</div>
        </div>
      ),
    },
    { key: "branch", header: "Chi nhánh", render: (e) => <Badge tone="gray">{e.branch || "—"}</Badge> },
    { key: "role", header: "Chức vụ", render: (e) => <span className="text-gray-700 text-sm">{e.role}</span> },
    { key: "phone", header: "Số điện thoại", render: (e) => <span className="text-gray-600 text-sm">{e.phone || "—"}</span> },
    { key: "status", header: "Trạng thái", render: (e) => <StatusBadge status={e.status === "đang làm" ? "Hoạt động" : "Bị khóa"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Bảng điều khiển" }]}
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng số nhân sự"
          value={String(totalEmployees)}
          description={`${activeEmployees} đang công tác`}
          icon={<FontAwesomeIcon icon={faUsers} fontSize={18} />}
          tone="primary"
        />
        <StatCard
          title="Chi nhánh hoạt động"
          value={String(activeBranches)}
          description={`${branches.length} chi nhánh toàn chuỗi`}
          icon={<FontAwesomeIcon icon={faStore} fontSize={18} />}
          tone="info"
        />
        <StatCard
          title="Cơ cấu Phòng ban"
          value={String(activeDepartments)}
          description={`${departments.length} bộ phận chuyên môn`}
          icon={<FontAwesomeIcon icon={faSitemap} fontSize={18} />}
          tone="warning"
        />
        <StatCard
          title="Ca làm việc & Vận hành"
          value={String(shiftsCount)}
          description="Lịch ca kíp & điểm danh"
          icon={<FontAwesomeIcon icon={faCalendarWeek} fontSize={18} />}
          tone="success"
        />
      </div>

      {/* Phân bổ nhân sự theo Chi nhánh */}
      <Card>
        <CardHeader>
          <CardTitle>Mạng lưới Chi nhánh & Phân bổ Nhân sự</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {branches.map((b) => {
            const count = displayedEmployees.filter(
              (e) => (e.branch || "").toLowerCase().replace(/-/g, "") === (b.slug || "").toLowerCase().replace(/-/g, "")
            ).length;
            const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;

            return (
              <div key={b.id || b.slug} className="p-3.5 rounded-lg border border-gray-100 hover:border-gray-200 transition-all bg-gray-50/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">{b.name}</span>
                    <Badge tone="gray">{b.slug}</Badge>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {count} nhân sự <span className="text-xs font-normal text-gray-500">({pct}%)</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>Địa chỉ: {b.address || "Chưa cập nhật"}</span>
                  <span>Quản lý: {b.manager || "Chưa bổ nhiệm"}</span>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* Danh sách nhân sự mới tiếp nhận */}
      <Card>
        <CardHeader>
          <CardTitle>Nhân sự Mới Tiếp nhận</CardTitle>
        </CardHeader>
        <CardBody className="pt-2">
          <Table columns={employeeColumns} data={recentEmployees} rowKey={(e) => e.id} emptyMessage="Chưa có nhân sự nào" />
        </CardBody>
      </Card>
    </div>
  );
}
