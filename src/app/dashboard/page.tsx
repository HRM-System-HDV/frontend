"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBuildingColumns,
  faCalendarWeek,
  faCoins,
  faNewspaper,
  faPlus,
  faRotateRight,
  faSitemap,
  faStore,
  faUserCheck,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { apiGet } from "@/lib/api";
import { branches as initialBranches, departments as initialDepartments, employees as initialEmployees } from "@/mock-data/portal";
import type { Branch, Department, Employee } from "@/types";
import { useCurrentUser } from "@/context/AuthContext";

export default function DashboardOverviewPage() {
  const { role, branchSlug } = useCurrentUser();
  const isManager = role === "manager";

  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [shiftsCount, setShiftsCount] = useState<number>(4);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bData, dData, eData, sData] = await Promise.all([
        apiGet<Branch[]>("/api/branches").catch(() => null),
        apiGet<Department[]>("/api/departments").catch(() => null),
        apiGet<Employee[]>("/api/employees").catch(() => null),
        apiGet<any[]>("/api/shifts").catch(() => null),
      ]);

      if (bData && Array.isArray(bData)) setBranches(bData);
      if (dData && Array.isArray(dData)) setDepartments(dData);
      if (eData && Array.isArray(eData)) setEmployees(eData);
      if (sData && Array.isArray(sData)) setShiftsCount(sData.length);
    } catch {
      // Fallback to initial mock data on network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter if manager
  const displayedEmployees = isManager
    ? employees.filter(
        (e) =>
          (e.branch || "").toLowerCase().replace(/-/g, "") === branchSlug.toLowerCase().replace(/-/g, "") ||
          e.branch === "HN-1"
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
        title={isManager ? "Tổng quan Vận hành Chi nhánh" : "Tổng quan Doanh nghiệp & Vận hành"}
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Bảng điều khiển" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="white" onClick={loadData} disabled={loading}>
              <FontAwesomeIcon icon={faRotateRight} className={loading ? "animate-spin" : ""} /> Làm mới
            </Button>
            {!isManager && (
              <Link href="/dashboard/employees">
                <Button>
                  <FontAwesomeIcon icon={faPlus} /> Thêm nhân sự
                </Button>
              </Link>
            )}
          </div>
        }
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

      {/* Grid: Branch Breakdown + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phân bổ nhân sự theo Chi nhánh */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Mạng lưới Chi nhánh & Phân bổ Nhân sự</CardTitle>
                <div className="text-xs text-gray-500 mt-0.5">Số lượng nhân sự phân bố theo các chi nhánh chuỗi</div>
              </div>
              <Link href="/dashboard/branches" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Xem chi tiết <FontAwesomeIcon icon={faArrowRight} fontSize={12} />
              </Link>
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
        </div>

        {/* Lối tắt tác vụ nhanh */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Lối tắt Tác vụ Quản trị</CardTitle>
              <div className="text-xs text-gray-500 mt-0.5">Truy cập nhanh các phân hệ chức năng</div>
            </CardHeader>
            <CardBody className="space-y-2.5">
              <Link
                href="/dashboard/employees"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary-50/30 transition-all text-sm font-medium text-gray-700"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary-100 text-primary flex items-center justify-center">
                    <FontAwesomeIcon icon={faUsers} fontSize={14} />
                  </span>
                  <span>Hồ sơ Nhân sự</span>
                </div>
                <FontAwesomeIcon icon={faArrowRight} fontSize={12} className="text-gray-400" />
              </Link>

              <Link
                href="/dashboard/branches"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary-50/30 transition-all text-sm font-medium text-gray-700"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-info-100 text-info flex items-center justify-center">
                    <FontAwesomeIcon icon={faStore} fontSize={14} />
                  </span>
                  <span>Quản lý Chi nhánh</span>
                </div>
                <FontAwesomeIcon icon={faArrowRight} fontSize={12} className="text-gray-400" />
              </Link>

              <Link
                href="/dashboard/departments"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary-50/30 transition-all text-sm font-medium text-gray-700"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-warning-100 text-warning flex items-center justify-center">
                    <FontAwesomeIcon icon={faSitemap} fontSize={14} />
                  </span>
                  <span>Cơ cấu Phòng ban</span>
                </div>
                <FontAwesomeIcon icon={faArrowRight} fontSize={12} className="text-gray-400" />
              </Link>

              <Link
                href="/dashboard/shifts"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary-50/30 transition-all text-sm font-medium text-gray-700"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-success-100 text-success flex items-center justify-center">
                    <FontAwesomeIcon icon={faCalendarWeek} fontSize={14} />
                  </span>
                  <span>Phân ca làm việc</span>
                </div>
                <FontAwesomeIcon icon={faArrowRight} fontSize={12} className="text-gray-400" />
              </Link>

              <Link
                href="/dashboard/payslips"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary-50/30 transition-all text-sm font-medium text-gray-700"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <FontAwesomeIcon icon={faCoins} fontSize={14} />
                  </span>
                  <span>Bảng lương & Lệnh chi</span>
                </div>
                <FontAwesomeIcon icon={faArrowRight} fontSize={12} className="text-gray-400" />
              </Link>

              <Link
                href="/dashboard/news"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary-50/30 transition-all text-sm font-medium text-gray-700"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <FontAwesomeIcon icon={faNewspaper} fontSize={14} />
                  </span>
                  <span>Bảng tin & Thông báo</span>
                </div>
                <FontAwesomeIcon icon={faArrowRight} fontSize={12} className="text-gray-400" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Danh sách nhân sự mới tiếp nhận */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Nhân sự Mới Tiếp nhận</CardTitle>
            <div className="text-xs text-gray-500 mt-0.5">Danh sách các thành viên mới nhất trong tổ chức</div>
          </div>
          <Link href="/dashboard/employees" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            Xem toàn bộ <FontAwesomeIcon icon={faArrowRight} fontSize={12} />
          </Link>
        </CardHeader>
        <CardBody className="pt-2">
          <Table columns={employeeColumns} data={recentEmployees} rowKey={(e) => e.id} emptyMessage="Chưa có nhân sự nào" />
        </CardBody>
      </Card>
    </div>
  );
}
