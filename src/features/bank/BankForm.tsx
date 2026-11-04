"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuildingColumns,
  faShieldHalved,
  faCircleCheck,
  faCircleXmark,
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
  onDeleted?: (id: string) => void;
}

export default function BankConfigModal({ partner, onClose, onSaved, onDeleted }: Props) {
  const [accountName, setAccountName] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("hoạt động");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (partner) {
      setAccountName(partner.accountName || "");
      setBranch(partner.branch || "");
      setStatus(partner.status === "active" ? "hoạt động" : "vô hiệu hóa");
      setError(null);
    }
  }, [partner]);

  if (!partner) return null;

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa liên kết tài khoản ngân hàng ${partner.name} (${partner.accountNumber})?`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${GATEWAY_URL}/api/payroll/bank-accounts/${partner.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Lỗi xóa tài khoản");
      }
      onDeleted?.(partner.id);
      onClose();
    } catch (e: any) {
      setError(e.message || "Lỗi xóa tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${GATEWAY_URL}/api/payroll/bank-accounts/${partner.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: accountName.trim(),
          branch: branch.trim(),
          status,
        }),
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
      const row = data as { accountName?: string; bankName?: string; branch?: string; balance?: number; status?: string };
      onSaved?.({
        ...partner,
        accountName: row.accountName ?? accountName.trim() ?? partner.accountName,
        branch: row.branch ?? branch.trim() ?? partner.branch,
        name: row.bankName ?? partner.name,
      });
      onClose();
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Lỗi cập nhật cấu hình ngân hàng.");
    } finally {
      setSaving(false);
    }
  };

  const isConnected = partner.connectionStatus === "connected";

  return (
    <Modal
      open={Boolean(partner)}
      onClose={onClose}
      title={`Thông tin Tài khoản & Kết nối: ${partner.shortName}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button variant="white" onClick={onClose} disabled={saving} className="text-xs">
              Đóng
            </Button>
            {onDeleted && (
              <Button variant="danger" onClick={handleDelete} disabled={saving} className="text-xs">
                Xóa tài khoản
              </Button>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving} className="text-xs">
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
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

        <Field label="Chủ tài khoản (Người dùng tự nhập)">
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} disabled={saving} />
        </Field>

        <Field label="Chi nhánh mở tài khoản (Người dùng tự nhập)">
          <Input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Ví dụ: Chi nhánh Ba Đình - Hà Nội"
            disabled={saving}
          />
        </Field>

        <Field label="Trạng thái tài khoản">
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

        {/* Khung hệ thống tự động xác nhận trạng thái */}
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <FontAwesomeIcon icon={faShieldHalved} />
            Chứng thực Bảo mật & Trạng thái Hệ thống
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Trạng thái liên kết:</span>
            {isConnected ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <FontAwesomeIcon icon={faCircleCheck} fontSize={11} /> Đã kết nối & Sẵn sàng chi lương
              </span>
            ) : (
              <span className="font-semibold text-red-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faCircleXmark} fontSize={11} /> Chưa kết nối Gateway
              </span>
            )}
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Chứng thực số doanh nghiệp:</span>
            <span className="font-semibold text-gray-900">
              {isConnected ? `Hợp lệ (Hạn đến: ${partner.certExpiry})` : "Chưa cấu hình"}
            </span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Kênh truyền dữ liệu:</span>
            <span className="font-medium text-gray-800">{partner.channel || "Gateway"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <FontAwesomeIcon icon={faBuildingColumns} fontSize={11} />
            Chi nhánh đăng ký: <span className="font-semibold text-gray-800">{branch || "Chưa nhập chi nhánh"}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  isFirstAccount?: boolean;
}

const COMMON_BANKS = [
  "Vietcombank (VCB)",
  "Techcombank (TCB)",
  "MB Bank (MB)",
  "BIDV",
  "VietinBank (CTG)",
  "ACB",
  "VPBank",
  "TPBank",
  "Khác",
];

export function CreateBankAccountModal({
  open,
  onClose,
  onCreated,
  isFirstAccount = false,
}: CreateModalProps) {
  const [bankName, setBankName] = useState("Vietcombank (VCB)");
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("CÔNG TY CỔ PHẦN HRM SYSTEM");
  const [branch, setBranch] = useState("Chi nhánh Ba Đình - Hà Nội");
  const [balanceStr, setBalanceStr] = useState("500000000");
  const [isPrimary, setIsPrimary] = useState(isFirstAccount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBankName("Vietcombank (VCB)");
      setCustomBankName("");
      setAccountNumber("");
      setAccountName("CÔNG TY CỔ PHẦN HRM SYSTEM");
      setBranch("Chi nhánh Ba Đình - Hà Nội");
      setBalanceStr("500000000");
      setIsPrimary(isFirstAccount);
      setError(null);
    }
  }, [open, isFirstAccount]);

  const handleSubmit = async () => {
    const finalBank = bankName === "Khác" ? customBankName.trim() : bankName;
    if (!finalBank) {
      setError("Vui lòng chọn hoặc nhập tên ngân hàng.");
      return;
    }
    if (!accountNumber.trim()) {
      setError("Vui lòng nhập số tài khoản ngân hàng.");
      return;
    }
    if (!accountName.trim()) {
      setError("Vui lòng nhập tên chủ tài khoản / doanh nghiệp.");
      return;
    }
    const balanceNum = Number(balanceStr);
    if (!Number.isFinite(balanceNum) || balanceNum < 0) {
      setError("Số dư ban đầu không hợp lệ (phải >= 0).");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${GATEWAY_URL}/api/payroll/bank-accounts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: finalBank,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          branch: branch.trim(),
          balance: balanceNum,
          isPrimary,
        }),
      });
      const text = await res.text();
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
      if (!res.ok) {
        throw new Error(body?.error?.message || `HTTP_${res.status}`);
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message || "Lỗi tạo tài khoản ngân hàng");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm tài khoản ngân hàng doanh nghiệp"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="white" onClick={onClose} disabled={saving} className="text-xs">
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="text-xs">
            {saving ? "Đang thêm..." : "Liên kết tài khoản"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        <Field label="Ngân hàng" required>
          <Select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            disabled={saving}
          >
            {COMMON_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Field>

        {bankName === "Khác" && (
          <Field label="Tên ngân hàng cụ thể" required>
            <Input
              value={customBankName}
              onChange={(e) => setCustomBankName(e.target.value)}
              placeholder="Nhập tên ngân hàng..."
              disabled={saving}
            />
          </Field>
        )}

        <Field label="Số tài khoản nguồn trích tiền *" required>
          <Input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Ví dụ: 0011004123456"
            disabled={saving}
            className="font-mono"
          />
        </Field>

        <Field label="Tên chủ tài khoản (Doanh nghiệp) *" required>
          <Input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Ví dụ: CÔNG TY CỔ PHẦN HRM SYSTEM"
            disabled={saving}
          />
        </Field>

        <Field label="Chi nhánh mở tài khoản (Tự nhập)">
          <Input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Ví dụ: Chi nhánh Ba Đình - Hà Nội"
            disabled={saving}
          />
        </Field>

        <Field label="Số dư ban đầu khả dụng (VNĐ)" required>
          <Input
            type="number"
            value={balanceStr}
            onChange={(e) => setBalanceStr(e.target.value)}
            placeholder="500000000"
            disabled={saving}
          />
        </Field>

        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            disabled={saving}
            className="w-4 h-4 accent-primary rounded"
          />
          <span className="font-medium text-gray-700">
            Đặt làm tài khoản chi lương chính (mặc định)
          </span>
        </label>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
