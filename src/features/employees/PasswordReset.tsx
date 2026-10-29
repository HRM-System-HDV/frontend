"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Form";
import type { Employee } from "@/types";

interface Props {
  employee: Employee | null;
  onClose: () => void;
}

export default function ResetPasswordModal({ employee, onClose }: Props) {
  return (
    <Modal
      open={!!employee}
      onClose={onClose}
      title={`Cấp lại mật khẩu — ${employee?.name ?? ""}`}
      size="md"
      footer={
        <>
          <Button variant="white" onClick={onClose}>Hủy</Button>
          <Button onClick={onClose}>Lưu</Button>
        </>
      }
    >
      <Field label="Mật khẩu mới" required>
        <Input type="password" placeholder="Nhập mật khẩu mới" />
      </Field>
    </Modal>
  );
}
