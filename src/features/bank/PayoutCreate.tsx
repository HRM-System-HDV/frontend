"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillTransfer,
  faShieldHalved,
  faArrowsRotate,
  faCopy,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Select, Input } from "@/components/ui/Form";
import { formatVND } from "@/lib/utils";
import { createPayout, GatewayError } from "@/lib/api";
import type { BankPartner, SoapTransaction } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  partners: BankPartner[];
  onDisburseSuccess: (newTx: SoapTransaction, deduped: boolean) => void;
}

function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `KEY-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

function toDisplayDate(isoOrNow: string): string {
  const d = isoOrNow ? new Date(isoOrNow) : new Date();
  if (Number.isNaN(d.getTime())) return isoOrNow;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function CreatePayrollDisbursementModal({
  open,
  onClose,
  partners,
  onDisburseSuccess,
}: Props) {
  const [selectedBankId, setSelectedBankId] = useState(
    partners.find((p) => p.isPrimary)?.id || partners[0]?.id || ""
  );
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [content, setContent] = useState("");
  const [totalAmountStr, setTotalAmountStr] = useState("");
  const [beneficiaryCountStr, setBeneficiaryCountStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sinh idempotencyKey mới mỗi lần mở modal (kịch bản demo: giữ key để gửi trùng).
  useEffect(() => {
    if (open) {
      setIdempotencyKey(newIdempotencyKey());
      const now = new Date();
      setContent(`Chi lương tháng ${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`);
      setError(null);
    }
  }, [open ]);

  const selectedBank = partners.find((p) => p.id === selectedBankId) || partners[0];

  const handleDisburse = async () => {
    const totalAmount = Number(totalAmountStr);
    const beneficiaryCount = Number(beneficiaryCountStr);
    if (!selectedBank || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      setError("Vui lòng nhập tổng số tiền chi hợp lệ (> 0).");
      return;
    }
    if (!Number.isFinite(beneficiaryCount) || beneficiaryCount <= 0) {
      setError("Vui lòng nhập số lượng thụ hưởng hợp lệ (> 0).");
      return;
    }
    if (!idempotencyKey.trim()) {
      setError("Thiếu idempotencyKey. Vui lòng tạo key mới.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = (await createPayout({
        idempotencyKey: idempotencyKey.trim(),
        debitAccount: selectedBank.accountNumber,
        content: content.trim() || "Chi lương",
        totalAmount,
        beneficiaryCount,
      })) as unknown as {
        id: string;
        bankReference: string;
        debitAccount: string;
        totalAmount: number;
        content: string;
        beneficiaryCount: number;
        status: string;
        createdAt: string;
        deduped?: boolean;
      };
      const deduped = res.deduped === true;
      const tx: SoapTransaction = {
        id: res.id,
        batchName: res.content || content,
        bankName: selectedBank.shortName,
        totalEmployees: res.beneficiaryCount,
        totalAmount: res.totalAmount,
        status: res.status === "success" ? "success" : "processing",
        createdAt: toDisplayDate(res.createdAt),
        completedAt: toDisplayDate(res.createdAt),
        bankReference: res.bankReference,
        soapAction: "CreatePayout (REST)",
        xmlPayload: `REST POST /api/payroll/payouts\nidempotencyKey=${idempotencyKey}`,
        xmlResponse: `transactionId=${res.id}\nbankReference=${res.bankReference}${deduped ? "\ndeduped=true" : ""}`,
        deduped,
      };
      onDisburseSuccess(tx, deduped);
      if (deduped) {
        alert("Lệnh chi trùng, trả bản ghi cũ (deduped).");
      }
      onClose();
    } catch (e) {
      if (e instanceof GatewayError && e.code === "INSUFFICIENT_FUNDS") {
        setError("Số dư tài khoản công ty không đủ.");
      } else if (e instanceof GatewayError) {
        setError(e.message);
      } else {
        setError("Lỗi tạo lệnh chi. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(idempotencyKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo Lệnh Chuyển Lương Tự Động qua Ngân hàng"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button variant="white" onClick={onClose} disabled={loading} className="text-xs">
            Hủy
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="white"
              onClick={() => setIdempotencyKey(newIdempotencyKey())}
              disabled={loading}
              className="text-xs"
              title="Sinh key mới để tạo lệnh chi khác"
            >
              Key mới
            </Button>
            <Button onClick={handleDisburse} disabled={loading} className="text-xs">
              <FontAwesomeIcon
                icon={loading ? faArrowsRotate : faMoneyBillTransfer}
                className={loading ? "animate-spin" : ""}
              />
              {loading ? "Đang xử lý chuyển tiền qua ngân hàng..." : "Xác nhận & Chuyển lương ngay"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-4 bg-primary-50/30 border border-primary-200 rounded-xl">
          <div className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
            <FontAwesomeIcon icon={faShieldHalved} />
            Lệnh chi lương điện tử tự động — Tiền sẽ chuyển trực tiếp vào tài khoản nhân sự
          </div>
          <div className="text-xs text-gray-600">
            Gửi 2 lần liên tiếp với cùng 1 key → lần 2 hiện badge{" "}
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Trùng
            </span>{" "}
            thay vì tạo mới (demo Idempotent).
          </div>
        </div>

        {/* Idempotency key */}
        <Field label="Khóa chống trùng (idempotencyKey)" required>
          <div className="flex items-center gap-2">
            <Input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} disabled={loading} className="font-mono text-xs" />
            <Button variant="white" onClick={copyKey} className="text-xs shrink-0" title="Sao chép key">
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} fontSize={12} />
              {copied ? "Đã chép" : "Chép"}
            </Button>
          </div>
        </Field>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 block">
            Tài khoản Doanh nghiệp nguồn trích tiền <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs hover:border-gray-300 transition-colors">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                1. Ngân hàng
              </label>
              <Select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                disabled={loading}
                className="text-xs font-bold text-gray-900"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                2. Số tài khoản (STK)
              </label>
              <div className="h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center font-mono font-bold text-xs text-primary">
                {selectedBank?.accountNumber ?? "—"}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                3. Số dư khả dụng
              </label>
              <div className="h-9 px-3 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center font-bold text-xs text-emerald-700">
                {selectedBank ? formatVND(selectedBank.balance) : "—"}
              </div>
            </div>
          </div>
        </div>

        <Field label="Nội dung chuyển khoản" required>
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            placeholder="Ví dụ: Chi lương tháng 10/2026"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Tổng số tiền (VND)" required>
            <Input
              value={totalAmountStr}
              onChange={(e) => setTotalAmountStr(e.target.value)}
              disabled={loading}
              inputMode="numeric"
              placeholder="50000000"
            />
          </Field>
          <Field label="Số lượng thụ hưởng" required>
            <Input
              value={beneficiaryCountStr}
              onChange={(e) => setBeneficiaryCountStr(e.target.value)}
              disabled={loading}
              inputMode="numeric"
              placeholder="10"
            />
          </Field>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1.5">
          <div className="flex justify-between">
            <span>Kênh thực hiện:</span>
            <span className="font-semibold text-gray-900">REST Idempotent qua Gateway (:4000)</span>
          </div>
          <div className="flex justify-between">
            <span>Phí giao dịch chuyển lương:</span>
            <span className="font-semibold text-emerald-700">0 đ (Miễn phí theo thỏa thuận doanh nghiệp)</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
