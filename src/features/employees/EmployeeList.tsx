"use client";

import { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faMagnifyingGlass,
  faSitemap,
  faStore,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Form";
import type { Employee, Branch, Department } from "@/types";

interface Props {
  employees: Employee[];
  branches?: Branch[];
  departments?: Department[];
  onOpenDetail?: (e: Employee) => void;
  onSelect?: (e: Employee) => void;
  onLock?: (e: Employee) => void;
  onDelete?: (e: Employee) => void;
  isManager?: boolean;
  managerBranch?: string;
}

export default function EmployeeSection({
  employees,
  branches = [],
  departments = [],
  onOpenDetail,
  onSelect,
  onLock,
  onDelete,
  isManager = false,
  managerBranch,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>(
    isManager && managerBranch ? managerBranch : "all"
  );
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.phone.includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department && e.department.toLowerCase().includes(q));

      const matchesBranch = branchFilter === "all" || e.branch === branchFilter;
      const matchesDepartment =
        departmentFilter === "all" || e.department === departmentFilter;

      return matchesSearch && matchesBranch && matchesDepartment;
    });
  }, [employees, searchQuery, branchFilter, departmentFilter]);

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Nhân viên",
      render: (e) => (
        <div className="flex items-center gap-2.5">
          {e.avatar ? (
            <img
              src={e.avatar}
              alt={e.name}
              className="w-8 h-8 rounded-full object-cover border border-primary/20 shrink-0"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
              {e.name.charAt(0)}
            </span>
          )}
          <div>
            <div className="font-semibold text-gray-800">{e.name}</div>
            <div className="text-xs text-gray-400 font-mono">{e.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: "branch",
      header: "Chi nhánh",
      render: (e) => <Badge tone="gray">{e.branch}</Badge>,
    },
    {
      key: "department",
      header: "Phòng ban",
      render: (e) =>
        e.department ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {e.department}
          </span>
        ) : (
          <span className="text-gray-400 text-xs italic">Chưa gán</span>
        ),
    },
    {
      key: "role",
      header: "Vai trò",
      render: (e) => <span className="text-gray-600">{e.role}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (e) => (
        <button
          type="button"
          onClick={() => {
            if (onOpenDetail) onOpenDetail(e);
            else if (onSelect) onSelect(e);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs"
        >
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Danh sách nhân sự
          {branchFilter !== "all" ? ` • ${branchFilter}` : ""}
          {departmentFilter !== "all" ? ` • ${departmentFilter}` : ""}
          {" "}
          {filteredEmployees.length !== employees.length
            ? `(${filteredEmployees.length}/${employees.length})`
            : `(${employees.length})`}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc Chi nhánh */}
          {isManager ? (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700">
              <FontAwesomeIcon icon={faStore} fontSize={14} className="text-primary" />
              <span>
                Chi nhánh: <strong className="text-gray-900">{managerBranch}</strong>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary border border-primary-200">
                Cố định
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
              <FontAwesomeIcon icon={faStore} fontSize={14} className="text-gray-500" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-gray-800 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                    {b.slug.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lọc Phòng ban (Toàn công ty) */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
            <FontAwesomeIcon icon={faSitemap} fontSize={13} className="text-gray-500" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-gray-800 focus:outline-hidden cursor-pointer max-w-[135px] truncate"
            >
              <option value="all">Tất cả phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-48">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              fontSize={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Tìm tên, SĐT, email..."
              className="pl-8 py-1.5 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardBody className="pt-2">
        <Table
          columns={columns}
          data={filteredEmployees}
          rowKey={(e) => e.id}
          emptyMessage="Không có nhân viên nào phù hợp bộ lọc"
        />
      </CardBody>
    </Card>
  );
}
