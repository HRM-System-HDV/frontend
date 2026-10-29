"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Form";

interface Props {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  name: string;
  start: string;
  end: string;
  onNameChange: (v: string) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onSave: () => void;
}

export default function TemplateModal({
  open,
  onClose,
  editing,
  name,
  start,
  end,
  onNameChange,
  onStartChange,
  onEndChange,
  onSave,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Sửa Khung Ca Mẫu" : "Thêm Khung Ca Mẫu"}
      size="md"
      footer={
        <>
          <Button variant="white" onClick={onClose}>Hủy</Button>
          <Button onClick={onSave}>Lưu khung ca</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Tên khung ca" required>
          <Input placeholder="Nhập tên khung ca..." value={name} onChange={(e) => onNameChange(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Giờ bắt đầu" required>
            <Input type="time" value={start} onChange={(e) => onStartChange(e.target.value)} />
          </Field>
          <Field label="Giờ kết thúc" required>
            <Input type="time" value={end} onChange={(e) => onEndChange(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
