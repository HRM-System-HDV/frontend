"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { apiPost, GatewayError } from "@/lib/api";
import type { Employee } from "@/types";

interface Props {
  employee: Employee | null;
  onClose: () => void;
}

interface ResetResult {
  ok: boolean;
  email: string;
  tempPassword: string;
}

export default function ResetPasswordModal({ employee, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!employee?.email) return;
    setBusy(true);
    setError("");
    try {
      const data = await apiPost<ResetResult>("/api/auth/reset-password", {
        email: employee.email,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof GatewayError ? e.message : "Cấp lại mật khẩu thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!employee}
      onClose={onClose}
      title={`Cấp lại mật khẩu — ${employee?.name ?? ""}`}
      size="md"
      footer={
        <>
          <Button variant="white" onClick={onClose} disabled={busy}>
            {result ? "Đóng" : "Hủy"}
          </Button>
          {!result && (
            <Button variant="danger" onClick={handleReset} disabled={busy || !employee?.email}>
              <FontAwesomeIcon icon={faKey} className="mr-1.5" />
              {busy ? "Đang cấp..." : "Cấp mật khẩu tạm"}
            </Button>
          )}
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Mật khẩu hiện tại sẽ bị thu hồi trên mọi thiết bị và hệ thống cấp một mật
        khẩu tạm. Hãy chuyển tận tay người dùng và yêu cầu họ đổi mật khẩu ngay
        lần đăng nhập tới.
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">
        {employee?.name} &lt;{employee?.email}&gt;
      </p>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Mật khẩu tạm cho {result.email}:
          </p>
          <p className="mt-1 select-all break-all font-mono text-base font-bold text-emerald-900">
            {result.tempPassword}
          </p>
        </div>
      )}
    </Modal>
  );
}
