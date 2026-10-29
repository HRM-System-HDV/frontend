"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuildingColumns,
  faShieldHalved,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { formatVND } from "@/lib/utils";
import { GATEWAY_URL, GatewayError } from "@/lib/api";
import type { BankPartner } from "./types";

interface Props {
  partner: BankPartner | null;
  onClose: () => void;
  onSaved?: (updated: BankPartner) => void;
}

export default function BankConfigModal({ partner, onClose, onSaved }: Props) {
  const [accountName, setAccountName] = useState("");
  const [status, setStatus] = useState("hoạt động");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (partner) {
      setAccountName(partner.accountName);
      setStatus(partner.status === "active" ? "hoạt động" : "vô hiệu hóa");
      setError(null);
    }
  }, [partner]);

  if (!partner) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${GATEWAY_URL}/api/payroll/bank-accounts/${partner.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName: accountName.trim(), status }),
      });
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      if (!res.ok) {
        const err = (body as { error?: { code: string; message: string } } | null)?.error;
        throw new GatewayError(err?.code || `HTTP_${res.status}`, err?.message || `Lỗi hệ thống (${res.status})`, res.status);
      }
      const data = (body as { data: unknown } | null)?.data ?? body;
      const row = data as { accountName?: string; bankName?: string; balance?: number; status?: string };
      onSaved?.({
        ...partner,
        accountName: row.accountName ?? accountName.trim() ?? partner.accountName,
        name: row.bankName ?? partner.name,
      });
      onClose();
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Lỗi cập nhật cấu hình ngân hàng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(partner)}
      onClose={onClose}
      title={`Thông tin Tài khoản & Kết nối: ${partner.shortName}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="white" onClick={onClose} disabled={saving} className="text-xs">
            Đóng
          </Button>
          <Button onClick={handleSave} disabled={saving} className="text-xs">
            {saving ? "Đang lưu..." : "Lưu cấu hình (PUT)"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Tên ngân hàng:</span>
            <span className="font-bold text-gray-900">{partner.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Số tài khoản nguồn chi:</span>
            <span className="font-mono font-bold text-primary">{partner.accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Số dư khả dụng hiện tại:</span>
            <span className="font-bold text-emerald-700 text-sm">{formatVND(partner.balance)}</span>
          </div>
        </div>

        <Field label="Chủ tài khoản">
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} disabled={saving} />
        </Field>

        <Field label="Trạng thái">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={saving}>
            <option value="hoạt động">hoạt động</option>
            <option value="vô hiệu hóa">vô hiệu hóa</option>
          </Select>
        </Field>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <FontAwesomeIcon icon={faShieldHalved} />
            Chứng thực Bảo mật & Trạng thái Liên kết
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Trạng thái liên kết:</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <FontAwesomeIcon icon={faCircleCheck} fontSize={11} /> Đã liên kết & Sẵn sàng chi lương
            </span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Chứng thực số doanh nghiệp:</span>
            <span className="font-semibold text-gray-900">Hợp lệ (Hạn đến: {partner.certExpiry})</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Kênh truyền dữ liệu:</span>
            <span className="font-medium text-gray-800">PUT /api/payroll/bank-accounts/:id qua Gateway</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <FontAwesomeIcon icon={faBuildingColumns} fontSize={11} />
            Chi nhánh mở tài khoản: <span className="font-semibold text-gray-800">{partner.branch}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
