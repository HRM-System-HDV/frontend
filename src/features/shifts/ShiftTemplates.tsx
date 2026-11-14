"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Table, { Column } from "@/components/ui/Table";
import type { ShiftTemplate } from "@/features/shifts/types";

function getDuration(startTime: string, endTime: string) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let hours = eh - sh;
  let mins = em - sm;
  if (mins < 0) { hours -= 1; mins += 60; }
  if (hours < 0) hours += 24;
  return `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();
}

interface Props {
  templates: ShiftTemplate[];
  onAdd: () => void;
  onEdit: (t: ShiftTemplate) => void;
  onDelete: (id: string) => void;
}

export default function ShiftTemplateSection({ templates, onAdd, onEdit, onDelete }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);

  const columns: Column<ShiftTemplate>[] = [
    { key: "name", header: "Tên Khung Ca", render: (t) => <span className="font-semibold text-gray-800">{t.name}</span> },
    { key: "startTime", header: "Giờ Bắt Đầu", render: (t) => <span className="font-mono text-gray-600">{t.startTime}</span> },
    { key: "endTime", header: "Giờ Kết Thúc", render: (t) => <span className="font-mono text-gray-600">{t.endTime}</span> },
    {
      key: "duration",
      header: "Thời lượng",
      render: (t) => <span className="text-sm text-gray-500">{getDuration(t.startTime, t.endTime)}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (t) => (
        <button
          type="button"
          onClick={() => setSelectedTemplate(t)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs"
        >
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <>
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

      {/* Modal Chi tiết khung ca: chứa toàn bộ thao tác sửa/xóa */}
      <Modal
        open={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        title="Chi tiết khung ca mẫu"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (selectedTemplate) {
                  onDelete(selectedTemplate.id);
                  setSelectedTemplate(null);
                }
              }}
            >
              <FontAwesomeIcon icon={faTrashCan} className="mr-1.5" />
              Xóa khung ca
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="white" size="sm" onClick={() => setSelectedTemplate(null)}>
                Đóng
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (selectedTemplate) {
                    const target = selectedTemplate;
                    setSelectedTemplate(null);
                    onEdit(target);
                  }
                }}
              >
                Sửa khung ca
              </Button>
            </div>
          </div>
        }
      >
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <h4 className="font-bold text-gray-900 text-base">{selectedTemplate.name}</h4>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">Mã khung ca: {selectedTemplate.id}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500">Giờ bắt đầu:</span>
                <span className="font-mono font-semibold text-gray-800">{selectedTemplate.startTime}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500">Giờ kết thúc:</span>
                <span className="font-mono font-semibold text-gray-800">{selectedTemplate.endTime}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Thời lượng:</span>
                <span className="font-semibold text-gray-800">
                  {getDuration(selectedTemplate.startTime, selectedTemplate.endTime)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
