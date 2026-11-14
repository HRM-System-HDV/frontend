"use client";

import { useState } from "react";
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
import { formatDate, formatVND } from "@/lib/utils";
import { apiDelete, apiPut, apiPost, GatewayError } from "@/lib/api";
import type { Branch } from "@/types";
import type { BankPartner } from "./types";

interface Props {
  partner: BankPartner | null;
  /** Danh sách chi nhánh (organization-service) để gán branchId cho tài khoản. */
  branches: Branch[];
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
  /** Đặt tài khoản làm nguồn chi lương chính (nút nằm trong modal chi tiết). */
  onSetPrimary?: (id: string) => void;
}

export default function BankConfigModal({ partner, branches, onClose, onSaved, onDeleted, onSetPrimary }: Props) {
  const [accountName, setAccountName] = useState(partner?.accountName || "");
  const [bankBranch, setBankBranch] = useState(partner?.bankBranch || "");
  const [branchId, setBranchId] = useState(partner?.branchId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!partner) return null;

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa liên kết tài khoản ngân hàng ${partner.name} (${partner.accountNumber})?`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiDelete(`/api/payroll/bank-accounts/${encodeURIComponent(partner.id)}`);
      onDeleted?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof GatewayError ? e.message : "Lỗi xóa tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Whitelist PUT /api/payroll/bank-accounts/:id: accountName, bankName, bankBranch, branchId, isPrimary.
      await apiPut(`/api/payroll/bank-accounts/${encodeURIComponent(partner.id)}`, {
        accountName: accountName.trim(),
        bankBranch: bankBranch.trim() || null,
        branchId: branchId || null,
      });
      onSaved?.();
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
            {onSetPrimary && !partner.isPrimary && (
              <Button
                variant="white"
                onClick={() => {
                  onSetPrimary(partner.id);
                  onClose();
                }}
                disabled={saving}
                className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                Chọn làm nguồn chính
              </Button>
            )}
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

        <Field label="Nơi mở tài khoản (ngân hàng / phòng giao dịch)">
          <Input
            value={bankBranch}
            onChange={(e) => setBankBranch(e.target.value)}
            placeholder="Ví dụ: Sở giao dịch Ba Đình - Hà Nội"
            disabled={saving}
          />
        </Field>

        <Field label="Chi nhánh công ty sở hữu tài khoản">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={saving}>
            <option value="">— Chưa gán chi nhánh —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
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
              {isConnected ? `Hợp lệ (Hạn đến: ${formatDate(partner.certExpiry) || "—"})` : "Chưa cấu hình"}
            </span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Kênh truyền dữ liệu:</span>
            <span className="font-medium text-gray-800">Qua api-gateway (:4000)</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <FontAwesomeIcon icon={faBuildingColumns} fontSize={11} />
            Nơi mở tài khoản: <span className="font-semibold text-gray-800">{bankBranch || "Chưa nhập"}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface CreateModalProps {
  open: boolean;
  branches: Branch[];
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
  branches,
  onClose,
  onCreated,
  isFirstAccount = false,
}: CreateModalProps) {
  const [bankName, setBankName] = useState("Vietcombank (VCB)");
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("CÔNG TY CỔ PHẦN HRM SYSTEM");
  const [bankBranch, setBankBranch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [balanceStr, setBalanceStr] = useState("500000000");
  const [isPrimary, setIsPrimary] = useState(isFirstAccount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!/^\d+$/.test(balanceStr.trim())) {
      setError("Số dư ban đầu phải là số VNĐ nguyên, không âm.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // balance gửi dạng chuỗi nguyên không dấu — BE money() chỉ chấp nhận /^\d+$/.
      await apiPost("/api/payroll/bank-accounts", {
        bankName: finalBank,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        bankBranch: bankBranch.trim() || null,
        branchId: branchId || null,
        balance: balanceStr.trim(),
        isPrimary,
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof GatewayError ? e.message : "Lỗi tạo tài khoản ngân hàng");
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

        <Field label="Nơi mở tài khoản (ngân hàng / phòng giao dịch)">
          <Input
            value={bankBranch}
            onChange={(e) => setBankBranch(e.target.value)}
            placeholder="Ví dụ: Sở giao dịch Ba Đình - Hà Nội"
            disabled={saving}
          />
        </Field>

        <Field label="Chi nhánh công ty sở hữu tài khoản">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={saving}>
            <option value="">— Chưa gán chi nhánh —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
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
