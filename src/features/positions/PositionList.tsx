"use client";

import { useMemo } from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Table, { Column } from "@/components/ui/Table";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Form";
import type { Department, Position } from "@/types";

interface Props {
  positions: Position[];
  departments: Department[];
  onEdit: (p: Position) => void;
}

export default function PositionList({ positions, departments, onEdit }: Props) {
  const [searchQuery, setSearchQuery] = useLocalStorageState<string>("hrm_positions_search", "");

  const departmentName = useMemo(
    () => new Map(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  const filteredPositions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.positionCode.toLowerCase().includes(q) ||
        (p.departmentId ? (departmentName.get(p.departmentId) || "").toLowerCase().includes(q) : true)
    );
  }, [positions, searchQuery, departmentName]);

  const columns: Column<Position>[] = [
    {
      key: "name",
      header: "Vị trí / Chức danh",
      render: (p) => (
        <div className="min-w-0">
          <span className="font-semibold text-gray-900">{p.name}</span>
          <span className="block font-mono text-xs text-gray-500">{p.positionCode}</span>
        </div>
      ),
    },
    {
      key: "departmentId",
      header: "Phòng ban",
      render: (p) =>
        p.departmentId ? (
          <span className="text-sm text-gray-800">{departmentName.get(p.departmentId) || "Phòng ban đã bị xóa"}</span>
        ) : (
          <Badge tone="info">Dùng mọi phòng ban</Badge>
        ),
    },
    {
      key: "staff",
      header: "Hồ sơ đang dùng",
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-gray-800">{p.staff ?? 0}</span>
          <span className="text-xs text-gray-400">hồ sơ</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (p) => <StatusBadge status={p.status === "hoạt động" ? "Hoạt động" : "Bị khóa"} />,
    },
    {
      key: "actions" as keyof Position,
      header: "Thao tác",
      render: (p) => (
        <button
          type="button"
          onClick={() => onEdit(p)}
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
        <div className="flex items-center gap-2">
          <CardTitle>Danh mục Vị trí / Chức danh</CardTitle>
          <Badge tone="gray">{filteredPositions.length} vị trí</Badge>
        </div>
        <div className="relative w-64">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            fontSize={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="Tìm theo tên, mã, phòng ban..."
            className="pl-8 py-1.5 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardBody className="pt-2">
        <Table
          columns={columns}
          data={filteredPositions}
          rowKey={(p) => p.id}
          emptyMessage="Chưa có vị trí nào trong danh mục"
        />
      </CardBody>
    </Card>
  );
}
