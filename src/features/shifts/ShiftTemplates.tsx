"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table, { Column } from "@/components/ui/Table";
import type { ShiftTemplate } from "@/features/shifts/types";

interface Props {
  templates: ShiftTemplate[];
  onAdd: () => void;
  onEdit: (t: ShiftTemplate) => void;
  onDelete: (id: string) => void;
}

export default function ShiftTemplateSection({ templates, onAdd, onEdit, onDelete }: Props) {
  const columns: Column<ShiftTemplate>[] = [
    { key: "name", header: "Tên Khung Ca", render: (t) => <span className="font-semibold text-gray-800">{t.name}</span> },
    { key: "startTime", header: "Giờ Bắt Đầu", render: (t) => <span className="font-mono text-gray-600">{t.startTime}</span> },
    { key: "endTime", header: "Giờ Kết Thúc", render: (t) => <span className="font-mono text-gray-600">{t.endTime}</span> },
    {
      key: "duration",
      header: "Thời lượng",
      render: (t) => {
        const [sh, sm] = t.startTime.split(":").map(Number);
        const [eh, em] = t.endTime.split(":").map(Number);
        let hours = eh - sh;
        let mins = em - sm;
        if (mins < 0) { hours -= 1; mins += 60; }
        if (hours < 0) hours += 24;
        return <span className="text-sm text-gray-500">{hours}h {mins > 0 ? `${mins}m` : ""}</span>;
      },
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (t) => (
        <button
          type="button"
          onClick={() => onEdit(t)}
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
        <CardTitle>Khung giờ làm việc mẫu</CardTitle>
        <Button variant="white" size="sm" onClick={onAdd}>
          <FontAwesomeIcon icon={faPlus} fontSize={16} /> Thêm khung ca
        </Button>
      </CardHeader>
      <CardBody className="pt-2">
        <Table columns={columns} data={templates} rowKey={(t) => t.id} emptyMessage="Chưa có khung ca nào" />
      </CardBody>
    </Card>
  );
}
