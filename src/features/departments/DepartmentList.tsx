"use client";

import { useMemo } from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Form";
import type { Department } from "@/types";

interface Props {
  departments: Department[];
  onEdit: (d: Department) => void;
}

export default function DepartmentList({
  departments,
  onEdit,
}: Props) {
  const [searchQuery, setSearchQuery] = useLocalStorageState<string>("hrm_departments_search", "");

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.departmentCode.toLowerCase().includes(q) ||
        // `manager` có thể null (phòng ban chưa bổ nhiệm người phụ trách) —
        // bắt buộc chặn null trước khi toLowerCase, giống cột "Phụ trách" bên dưới.
        Boolean(d.manager && d.manager.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);


  const columns: Column<Department>[] = [
    {
      key: "name",
      header: "Phòng ban",
      render: (d) => (
        <span className="font-semibold text-gray-900">{d.name}</span>
      ),
    },
    {
      key: "manager",
      header: "Phụ trách",
      render: (d) => (
        <span className="font-medium text-gray-800 text-sm">{d.manager || "Chưa bổ nhiệm"}</span>
      ),
    },
    {
      key: "staff",
      header: "Nhân sự",
      render: (d) => {
        const count = d.staff ?? 0;
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-gray-800">{count}</span>
            <span className="text-xs text-gray-400">nhân sự</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (d) => (
        <StatusBadge status={d.status === "hoạt động" ? "Hoạt động" : "Bị khóa"} />
      ),
    },
    // Quản lý cũng mở được "Chi tiết" phòng ban: backend cho quản lý ghi
    // phòng ban (authorize.js: departments -> MANAGERS), ẩn nút ở đây khiến
    // quản lý không sửa/khóa/xoá được phòng ban.
    {
      key: "actions" as keyof Department,
      header: "Thao tác",
      render: (d: Department) => (
        <div className="flex items-center gap-2">
          {/* Khóa/Xóa chỉ có trong modal chi tiết (DepartmentForm). */}
          <button
            type="button"
            onClick={() => onEdit(d)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs"
          >
            Chi tiết
          </button>
        </div>
      ),
    },
  ];

  return (
    <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Danh sách Phòng ban Doanh nghiệp</CardTitle>
            <Badge tone="gray">{filteredDepartments.length} phòng ban</Badge>
          </div>
          <div className="relative w-64">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              fontSize={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Tìm theo tên, người phụ trách..."
              className="pl-8 py-1.5 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <Table
            columns={columns}
            data={filteredDepartments}
            rowKey={(d) => d.id}
            emptyMessage="Không tìm thấy phòng ban nào"
          />
        </CardBody>
      </Card>
  );
}
