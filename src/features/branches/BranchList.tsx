"use client";

import { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Form";
import type { Branch } from "@/types";

interface Props {
  branches: Branch[];
  onEdit: (b: Branch) => void;
}

export default function BranchSection({ branches, onEdit }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.address && b.address.toLowerCase().includes(q)) ||
        (b.manager && b.manager.toLowerCase().includes(q))
    );
  }, [branches, searchQuery]);

  const columns: Column<Branch>[] = [
    {
      key: "name",
      header: "Chi nhánh",
      render: (b) => <span className="font-semibold text-gray-800">{b.name}</span>,
    },
    {
      key: "address",
      header: "Địa chỉ",
      render: (b) => (
        <span className="text-gray-600 text-sm max-w-[260px] truncate block" title={b.address}>
          {b.address}
        </span>
      ),
    },
    { key: "manager", header: "Quản lý", render: (b) => <span className="text-gray-700">{b.manager}</span> },
    { key: "staff", header: "Nhân sự", render: (b) => <span className="font-semibold text-gray-800">{b.staff}</span> },
    { key: "status", header: "Trạng thái", render: (b) => <StatusBadge status={b.status === "hoạt động" ? "Hoạt động" : "Bị khóa"} /> },
    {
      key: "actions",
      header: "Thao tác",
      render: (b) => (
        <div className="flex items-center gap-2">
          {/* Khóa/Xóa chỉ có trong modal chi tiết (BranchForm). */}
          <button
            type="button"
            onClick={() => onEdit(b)}
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
          <CardTitle>Danh sách chi nhánh</CardTitle>
          <Badge tone="gray">{filteredBranches.length} chi nhánh</Badge>
        </div>
        <div className="relative w-64">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            fontSize={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="Tìm theo tên, địa chỉ, quản lý..."
            className="pl-8 pr-7 py-1.5 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      </CardHeader>
      <CardBody className="pt-2">
        <Table
          columns={columns}
          data={filteredBranches}
          rowKey={(b) => b.id}
          emptyMessage={searchQuery.trim() ? "Không tìm thấy chi nhánh phù hợp" : "Chưa có chi nhánh nào"}
        />
      </CardBody>
    </Card>
  );
}
