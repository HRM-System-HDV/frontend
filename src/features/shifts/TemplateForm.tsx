"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Form";
import TimePicker24 from "@/components/ui/TimePicker24";

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
          <Field label="Giờ bắt đầu" required hint="Quy chuẩn 00:00 - 23:59">
            <TimePicker24 value={start} onChange={onStartChange} placeholder="07:00" />
          </Field>
          <Field label="Giờ kết thúc" required hint="Quy chuẩn 00:00 - 23:59">
            <TimePicker24 value={end} onChange={onEndChange} placeholder="14:00" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
